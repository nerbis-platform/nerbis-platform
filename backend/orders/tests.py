from datetime import timedelta
from decimal import Decimal
from unittest.mock import MagicMock, patch

from django.contrib.contenttypes.models import ContentType
from django.utils import timezone

from bookings.models import Appointment
from cart.models import Cart, CartItem
from core.test_base import TenantAwareTestCase
from ecommerce.models import Inventory, Product, ProductCategory
from orders.models import Order, OrderItem, Payment
from services.models import Service, ServiceCategory, StaffMember


class OrderTestMixin:
    """Helpers compartidos para los tests de órdenes."""

    @classmethod
    def create_product_with_inventory(
        cls,
        tenant,
        name="Crema Hidratante",
        price=Decimal("50.00"),
        stock=10,
        track_inventory=True,
    ):
        category = ProductCategory.objects.create(
            tenant=tenant,
            name="Facial",
            slug=f"facial-{name.lower().replace(' ', '-')}",
        )
        product = Product.objects.create(
            tenant=tenant,
            name=name,
            price=price,
            category=category,
            is_active=True,
        )
        Inventory.objects.create(
            tenant=tenant,
            product=product,
            stock=stock,
            track_inventory=track_inventory,
        )
        return product

    @classmethod
    def create_service_with_staff(cls, tenant, name="Limpieza Facial", price=Decimal("45.00"), duration=60):
        category = ServiceCategory.objects.create(
            tenant=tenant,
            name="Tratamientos",
            slug=f"tratamientos-{name.lower().replace(' ', '-')}",
        )
        staff_user = cls._create_staff_user(tenant, name)
        staff_member = StaffMember.objects.create(
            tenant=tenant,
            user=staff_user,
            position="Esteticista",
            is_available=True,
        )
        service = Service.objects.create(
            tenant=tenant,
            name=name,
            price=price,
            duration_minutes=duration,
            category=category,
            is_active=True,
        )
        service.assigned_staff.add(staff_member)
        return service, staff_member

    @classmethod
    def _create_staff_user(cls, tenant, label):
        from core.models import User

        slug = label.lower().replace(" ", "_")
        return User.objects.create_user(
            email=f"staff_{slug}@test.com",
            password="Staff123!",
            username=f"staff_{slug}",
            first_name="Staff",
            last_name=label,
            tenant=tenant,
            role="staff",
        )

    def add_product_to_cart(self, cart, product, quantity=1):
        ct = ContentType.objects.get_for_model(Product)
        return CartItem.objects.create(
            tenant=self.tenant,
            cart=cart,
            item_type="product",
            content_type=ct,
            object_id=product.pk,
            quantity=quantity,
            unit_price=product.price,
        )

    def add_service_to_cart(self, cart, service, staff_member, customer):
        start = timezone.now() + timedelta(days=3)
        appointment = Appointment.objects.create(
            tenant=self.tenant,
            customer=customer,
            staff_member=staff_member,
            service=service,
            start_datetime=start,
            end_datetime=start + timedelta(minutes=service.duration_minutes),
            status="pending",
            expires_at=timezone.now() + timedelta(minutes=30),
        )
        ct = ContentType.objects.get_for_model(Service)
        CartItem.objects.create(
            tenant=self.tenant,
            cart=cart,
            item_type="service",
            content_type=ct,
            object_id=service.pk,
            quantity=1,
            unit_price=service.price,
            appointment=appointment,
        )
        return appointment

    def get_billing_data(self):
        return {
            "billing_name": "Juan Perez",
            "billing_email": "juan@test.com",
            "billing_phone": "+34 600 000 000",
            "billing_address": "Calle Principal 123",
            "billing_city": "Madrid",
            "billing_postal_code": "28001",
            "billing_country": "ES",
            "use_billing_for_shipping": True,
        }


# ------------------------------------------------------------------ #
# 1. Crear orden calcula totales correctamente
# ------------------------------------------------------------------ #


class CreateOrderTotalsTest(OrderTestMixin, TenantAwareTestCase):
    """Test: crear orden calcula totales correctamente."""

    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        cls.product_a = cls.create_product_with_inventory(
            cls.tenant,
            name="Serum Vitamina C",
            price=Decimal("39.90"),
            stock=20,
        )
        cls.product_b = cls.create_product_with_inventory(
            cls.tenant,
            name="Exfoliante Corporal",
            price=Decimal("28.00"),
            stock=15,
        )

    @patch("orders.views.send_order_confirmation_email")
    def test_order_totals_single_product(self, mock_email):
        """Orden con 1 producto calcula subtotal, IVA y total."""
        self.authenticate_as_customer()
        cart = Cart.objects.create(tenant=self.tenant, user=self.customer_user)
        self.add_product_to_cart(cart, self.product_a, quantity=2)

        response = self.client.post("/api/checkout/create-order/", self.get_billing_data())
        self.assertEqual(response.status_code, 201)

        order = Order.objects.get(id=response.data["order"]["id"])

        expected_subtotal = Decimal("39.90") * 2  # 79.80
        expected_tax = (expected_subtotal * Decimal("0.21")).quantize(Decimal("0.01"))
        expected_total = expected_subtotal + expected_tax

        self.assertEqual(order.subtotal, expected_subtotal)
        self.assertEqual(order.tax_amount, expected_tax)
        self.assertEqual(order.total, expected_total)

    @patch("orders.views.send_order_confirmation_email")
    def test_order_totals_multiple_products(self, mock_email):
        """Orden con varios productos calcula subtotal correctamente."""
        self.authenticate_as_customer()
        cart = Cart.objects.create(tenant=self.tenant, user=self.customer_user)
        self.add_product_to_cart(cart, self.product_a, quantity=1)  # 39.90
        self.add_product_to_cart(cart, self.product_b, quantity=3)  # 28.00 * 3 = 84.00

        response = self.client.post("/api/checkout/create-order/", self.get_billing_data())
        self.assertEqual(response.status_code, 201)

        order = Order.objects.get(id=response.data["order"]["id"])
        expected_subtotal = Decimal("39.90") + Decimal("84.00")  # 123.90

        self.assertEqual(order.subtotal, expected_subtotal)
        self.assertEqual(order.product_items.count(), 2)

    @patch("orders.views.send_order_confirmation_email")
    def test_order_creates_item_snapshots(self, mock_email):
        """Los OrderItem guardan el nombre y precio del producto al momento de la compra."""
        self.authenticate_as_customer()
        cart = Cart.objects.create(tenant=self.tenant, user=self.customer_user)
        self.add_product_to_cart(cart, self.product_a, quantity=2)

        response = self.client.post("/api/checkout/create-order/", self.get_billing_data())
        self.assertEqual(response.status_code, 201)

        item = OrderItem.objects.get(order_id=response.data["order"]["id"])
        self.assertEqual(item.product_name, "Serum Vitamina C")
        self.assertEqual(item.unit_price, Decimal("39.90"))
        self.assertEqual(item.total_price, Decimal("79.80"))
        self.assertEqual(item.quantity, 2)

    @patch("orders.views.send_order_confirmation_email")
    def test_order_decreases_stock(self, mock_email):
        """Crear orden reduce el stock del producto."""
        self.authenticate_as_customer()
        cart = Cart.objects.create(tenant=self.tenant, user=self.customer_user)
        self.add_product_to_cart(cart, self.product_a, quantity=3)

        initial_stock = self.product_a.inventory.stock  # 20
        self.client.post("/api/checkout/create-order/", self.get_billing_data())

        self.product_a.inventory.refresh_from_db()
        self.assertEqual(self.product_a.inventory.stock, initial_stock - 3)

    @patch("orders.views.send_order_confirmation_email")
    def test_order_clears_cart(self, mock_email):
        """Crear orden vacía el carrito."""
        self.authenticate_as_customer()
        cart = Cart.objects.create(tenant=self.tenant, user=self.customer_user)
        self.add_product_to_cart(cart, self.product_a, quantity=1)

        self.client.post("/api/checkout/create-order/", self.get_billing_data())

        cart.refresh_from_db()
        self.assertEqual(cart.items.count(), 0)


# ------------------------------------------------------------------ #
# 2. Orden con IVA 21% correcto
# ------------------------------------------------------------------ #


class OrderTaxCalculationTest(OrderTestMixin, TenantAwareTestCase):
    """Test: orden con IVA 21% correcto."""

    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        cls.product = cls.create_product_with_inventory(
            cls.tenant,
            name="Crema Premium",
            price=Decimal("100.00"),
            stock=50,
        )

    @patch("orders.views.send_order_confirmation_email")
    def test_tax_rate_is_21_percent(self, mock_email):
        """La orden se crea con tax_rate = 0.21."""
        self.authenticate_as_customer()
        cart = Cart.objects.create(tenant=self.tenant, user=self.customer_user)
        self.add_product_to_cart(cart, self.product, quantity=1)

        response = self.client.post("/api/checkout/create-order/", self.get_billing_data())
        self.assertEqual(response.status_code, 201, response.data)
        order = Order.objects.get(id=response.data["order"]["id"])

        self.assertEqual(order.tax_rate, Decimal("0.21"))

    @patch("orders.views.send_order_confirmation_email")
    def test_tax_amount_correct_simple(self, mock_email):
        """IVA de 100.00 EUR = 21.00 EUR."""
        self.authenticate_as_customer()
        cart = Cart.objects.create(tenant=self.tenant, user=self.customer_user)
        self.add_product_to_cart(cart, self.product, quantity=1)

        response = self.client.post("/api/checkout/create-order/", self.get_billing_data())
        self.assertEqual(response.status_code, 201, response.data)
        order = Order.objects.get(id=response.data["order"]["id"])

        self.assertEqual(order.subtotal, Decimal("100.00"))
        self.assertEqual(order.tax_amount, Decimal("21.00"))
        self.assertEqual(order.total, Decimal("121.00"))

    @patch("orders.views.send_order_confirmation_email")
    def test_tax_amount_correct_with_quantity(self, mock_email):
        """IVA de 300.00 EUR (3 x 100) = 63.00 EUR."""
        self.authenticate_as_customer()
        cart = Cart.objects.create(tenant=self.tenant, user=self.customer_user)
        self.add_product_to_cart(cart, self.product, quantity=3)

        response = self.client.post("/api/checkout/create-order/", self.get_billing_data())
        self.assertEqual(response.status_code, 201, response.data)
        order = Order.objects.get(id=response.data["order"]["id"])

        self.assertEqual(order.subtotal, Decimal("300.00"))
        self.assertEqual(order.tax_amount, Decimal("63.00"))
        self.assertEqual(order.total, Decimal("363.00"))

    @patch("orders.views.send_order_confirmation_email")
    def test_total_equals_subtotal_plus_tax(self, mock_email):
        """total = subtotal + tax_amount (sin descuento ni envío)."""
        self.authenticate_as_customer()
        cart = Cart.objects.create(tenant=self.tenant, user=self.customer_user)
        self.add_product_to_cart(cart, self.product, quantity=2)

        response = self.client.post("/api/checkout/create-order/", self.get_billing_data())
        self.assertEqual(response.status_code, 201, response.data)
        order = Order.objects.get(id=response.data["order"]["id"])

        self.assertEqual(order.total, order.subtotal + order.tax_amount)


# ------------------------------------------------------------------ #
# 3. Orden sin stock falla correctamente
# ------------------------------------------------------------------ #


class OrderOutOfStockTest(OrderTestMixin, TenantAwareTestCase):
    """Test: orden sin stock falla correctamente."""

    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        cls.product_no_stock = cls.create_product_with_inventory(
            cls.tenant,
            name="Producto Agotado",
            price=Decimal("25.00"),
            stock=2,
        )

    @patch("orders.views.send_order_confirmation_email")
    def test_order_decreases_stock_correctly(self, mock_email):
        """Crear orden con stock suficiente reduce el inventario correctamente."""
        self.authenticate_as_customer()
        cart = Cart.objects.create(tenant=self.tenant, user=self.customer_user)
        self.add_product_to_cart(cart, self.product_no_stock, quantity=2)

        response = self.client.post("/api/checkout/create-order/", self.get_billing_data())
        self.assertEqual(response.status_code, 201)

        self.product_no_stock.inventory.refresh_from_db()
        self.assertEqual(self.product_no_stock.inventory.stock, 0)

    def test_empty_cart_returns_400(self):
        """Intentar crear orden con carrito vacío retorna 400."""
        self.authenticate_as_customer()
        Cart.objects.create(tenant=self.tenant, user=self.customer_user)

        response = self.client.post("/api/checkout/create-order/", self.get_billing_data())
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["error"], "Carrito vacío")

    def test_no_cart_returns_400(self):
        """Intentar crear orden sin carrito retorna 400."""
        self.authenticate_as_customer()

        response = self.client.post("/api/checkout/create-order/", self.get_billing_data())
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["error"], "Carrito vacío")

    @patch("orders.views.send_order_confirmation_email")
    def test_expired_appointment_in_cart_returns_400(self, mock_email):
        """Cita expirada en el carrito impide crear la orden."""
        self.authenticate_as_customer()
        service, staff = self.create_service_with_staff(self.tenant, name="Masaje Expirado", price=Decimal("60.00"))

        cart = Cart.objects.create(tenant=self.tenant, user=self.customer_user)
        start = timezone.now() + timedelta(days=3)
        appointment = Appointment.objects.create(
            tenant=self.tenant,
            customer=self.customer_user,
            staff_member=staff,
            service=service,
            start_datetime=start,
            end_datetime=start + timedelta(minutes=60),
            status="pending",
            expires_at=timezone.now() - timedelta(minutes=5),  # ya expirada
        )
        ct = ContentType.objects.get_for_model(Service)
        CartItem.objects.create(
            tenant=self.tenant,
            cart=cart,
            item_type="service",
            content_type=ct,
            object_id=service.pk,
            quantity=1,
            unit_price=service.price,
            appointment=appointment,
        )

        response = self.client.post("/api/checkout/create-order/", self.get_billing_data())
        self.assertEqual(response.status_code, 400)
        self.assertIn("expirado", response.data["error"].lower())

    def test_inventory_can_purchase_returns_false(self):
        """Inventory.can_purchase devuelve False cuando no hay stock suficiente."""
        self.assertFalse(self.product_no_stock.inventory.can_purchase(quantity=5))
        self.assertTrue(self.product_no_stock.inventory.can_purchase(quantity=2))
        self.assertFalse(self.product_no_stock.inventory.can_purchase(quantity=3))


# ------------------------------------------------------------------ #
# 4. Webhook Stripe confirma la orden
# ------------------------------------------------------------------ #


class StripeConfirmPaymentTest(OrderTestMixin, TenantAwareTestCase):
    """Test: webhook/confirm-payment Stripe confirma la orden."""

    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        cls.product = cls.create_product_with_inventory(
            cls.tenant, name="Producto Pago", price=Decimal("80.00"), stock=10
        )
        cls.service, cls.staff = cls.create_service_with_staff(cls.tenant, name="Servicio Pago", price=Decimal("50.00"))

    def _create_pending_order(self):
        """Helper: crea una orden pendiente con 1 producto y 1 servicio."""
        cart = Cart.objects.create(tenant=self.tenant, user=self.customer_user)
        self.add_product_to_cart(cart, self.product, quantity=1)
        appointment = self.add_service_to_cart(cart, self.service, self.staff, self.customer_user)

        with patch("orders.views.send_order_confirmation_email"):
            response = self.client.post("/api/checkout/create-order/", self.get_billing_data())

        self.assertEqual(response.status_code, 201, response.data)
        order = Order.objects.get(id=response.data["order"]["id"])
        return order, appointment

    @patch("billing.services.UsageTracker.record_usage")
    @patch("stripe.PaymentIntent.retrieve")
    def test_confirm_payment_marks_order_as_paid(self, mock_retrieve, _mock_usage):
        """Confirmar pago con Stripe exitoso marca la orden como pagada."""
        self.authenticate_as_customer()
        order, _ = self._create_pending_order()

        Payment.objects.create(
            tenant=self.tenant,
            order=order,
            stripe_payment_intent_id="pi_test_123",
            amount=order.total,
            status="pending",
        )

        mock_retrieve.return_value = MagicMock(status="succeeded")

        response = self.client.post(
            "/api/checkout/confirm-payment/",
            {"order_id": order.id, "payment_intent_id": "pi_test_123"},
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["message"], "Pago confirmado exitosamente")

        order.refresh_from_db()
        self.assertEqual(order.status, "paid")
        self.assertIsNotNone(order.paid_at)

    @patch("billing.services.UsageTracker.record_usage")
    @patch("stripe.PaymentIntent.retrieve")
    def test_confirm_payment_marks_payment_succeeded(self, mock_retrieve, _mock_usage):
        """Confirmar pago actualiza el registro Payment a 'succeeded'."""
        self.authenticate_as_customer()
        order, _ = self._create_pending_order()

        payment = Payment.objects.create(
            tenant=self.tenant,
            order=order,
            stripe_payment_intent_id="pi_test_456",
            amount=order.total,
            status="pending",
        )

        mock_retrieve.return_value = MagicMock(status="succeeded")

        self.client.post(
            "/api/checkout/confirm-payment/",
            {"order_id": order.id, "payment_intent_id": "pi_test_456"},
        )

        payment.refresh_from_db()
        self.assertEqual(payment.status, "succeeded")
        self.assertIsNotNone(payment.processed_at)

    @patch("billing.services.UsageTracker.record_usage")
    @patch("stripe.PaymentIntent.retrieve")
    def test_confirm_payment_confirms_appointments(self, mock_retrieve, _mock_usage):
        """Confirmar pago cambia las citas a 'confirmed' y marca is_paid=True."""
        self.authenticate_as_customer()
        order, appointment = self._create_pending_order()

        Payment.objects.create(
            tenant=self.tenant,
            order=order,
            stripe_payment_intent_id="pi_test_789",
            amount=order.total,
            status="pending",
        )

        mock_retrieve.return_value = MagicMock(status="succeeded")

        response = self.client.post(
            "/api/checkout/confirm-payment/",
            {"order_id": order.id, "payment_intent_id": "pi_test_789"},
        )

        self.assertEqual(response.data["appointments_confirmed"], 1)

        appointment.refresh_from_db()
        self.assertEqual(appointment.status, "confirmed")
        self.assertTrue(appointment.is_paid)

    @patch("stripe.PaymentIntent.retrieve")
    def test_confirm_payment_not_succeeded_returns_400(self, mock_retrieve):
        """Si el PaymentIntent no está en 'succeeded', retorna 400."""
        self.authenticate_as_customer()
        order, _ = self._create_pending_order()

        Payment.objects.create(
            tenant=self.tenant,
            order=order,
            stripe_payment_intent_id="pi_test_pending",
            amount=order.total,
            status="pending",
        )

        mock_retrieve.return_value = MagicMock(status="requires_payment_method")

        response = self.client.post(
            "/api/checkout/confirm-payment/",
            {"order_id": order.id, "payment_intent_id": "pi_test_pending"},
        )
        self.assertEqual(response.status_code, 400)

        order.refresh_from_db()
        self.assertEqual(order.status, "pending")

    @patch("stripe.PaymentIntent.retrieve")
    def test_confirm_already_paid_order_returns_200(self, mock_retrieve):
        """Si la orden ya está pagada, retorna 200 sin error."""
        self.authenticate_as_customer()
        order, _ = self._create_pending_order()
        order.mark_as_paid()

        response = self.client.post(
            "/api/checkout/confirm-payment/",
            {"order_id": order.id, "payment_intent_id": "pi_test_already"},
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["message"], "Orden ya confirmada")
        mock_retrieve.assert_not_called()

    def test_confirm_payment_missing_fields_returns_400(self):
        """Faltan order_id o payment_intent_id retorna 400."""
        self.authenticate_as_customer()

        response = self.client.post("/api/checkout/confirm-payment/", {})
        self.assertEqual(response.status_code, 400)

    def test_confirm_payment_nonexistent_order_returns_404(self):
        """Orden inexistente retorna 404."""
        self.authenticate_as_customer()

        response = self.client.post(
            "/api/checkout/confirm-payment/",
            {"order_id": 99999, "payment_intent_id": "pi_fake"},
        )
        self.assertEqual(response.status_code, 404)


# ------------------------------------------------------------------ #
# Tests adicionales del modelo Order
# ------------------------------------------------------------------ #


class OrderModelTest(OrderTestMixin, TenantAwareTestCase):
    """Tests unitarios de métodos del modelo Order."""

    def test_order_number_auto_generated(self):
        """El número de orden se genera automáticamente con formato ORD-YYYYMMDD-XXXXXXXX."""
        order = Order.objects.create(
            tenant=self.tenant,
            customer=self.customer_user,
            subtotal=Decimal("100.00"),
            tax_amount=Decimal("21.00"),
            total=Decimal("121.00"),
            billing_name="Test",
            billing_email="test@test.com",
        )
        self.assertTrue(order.order_number.startswith("ORD-"))
        # ORD-YYYYMMDD-XXXXXXXX = 4 + 8 + 1 + 8 = 21
        self.assertEqual(len(order.order_number), 21)

    def test_mark_as_paid(self):
        """mark_as_paid() cambia status y setea paid_at."""
        order = Order.objects.create(
            tenant=self.tenant,
            customer=self.customer_user,
            subtotal=Decimal("100.00"),
            tax_amount=Decimal("21.00"),
            total=Decimal("121.00"),
            billing_name="Test",
            billing_email="test@test.com",
        )
        self.assertIsNone(order.paid_at)

        order.mark_as_paid()
        order.refresh_from_db()

        self.assertEqual(order.status, "paid")
        self.assertIsNotNone(order.paid_at)

    def test_cancel(self):
        """cancel() cambia status y setea cancelled_at."""
        order = Order.objects.create(
            tenant=self.tenant,
            customer=self.customer_user,
            subtotal=Decimal("50.00"),
            tax_amount=Decimal("10.50"),
            total=Decimal("60.50"),
            billing_name="Test",
            billing_email="test@test.com",
        )
        order.cancel()
        order.refresh_from_db()

        self.assertEqual(order.status, "cancelled")
        self.assertIsNotNone(order.cancelled_at)

    def test_payment_mark_as_succeeded_cascades_to_order(self):
        """Payment.mark_as_succeeded() also marks the order as paid."""
        order = Order.objects.create(
            tenant=self.tenant,
            customer=self.customer_user,
            subtotal=Decimal("100.00"),
            tax_amount=Decimal("21.00"),
            total=Decimal("121.00"),
            billing_name="Test",
            billing_email="test@test.com",
        )
        payment = Payment.objects.create(
            tenant=self.tenant,
            order=order,
            amount=order.total,
            status="pending",
        )

        payment.mark_as_succeeded()

        payment.refresh_from_db()
        order.refresh_from_db()

        self.assertEqual(payment.status, "succeeded")
        self.assertIsNotNone(payment.processed_at)
        self.assertEqual(order.status, "paid")
        self.assertIsNotNone(order.paid_at)
