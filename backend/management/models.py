# backend/management/models.py
"""
Modulo de Gestion Comercial para NERBIS.

Permite a los tenants gestionar:
- Categorias de gastos
- Proveedores
- Ordenes de compra (con items)
- Movimientos de inventario
- Ventas (con items)
- Gastos
"""

from datetime import date
from decimal import Decimal

from django.core.validators import MinValueValidator
from django.db import models
from django.utils import timezone

from core.managers import TenantAwareManager
from core.models import TenantAwareModel

# ===================================
# CATEGORIAS DE GASTOS
# ===================================


class ExpenseCategory(TenantAwareModel):
    """
    Categorias para clasificar gastos del negocio.

    Ejemplos:
    - Insumos
    - Arriendo
    - Servicios publicos
    - Nomina
    """

    name = models.CharField(max_length=200, verbose_name="Nombre")

    slug = models.SlugField(max_length=220, blank=True, verbose_name="Slug")

    description = models.TextField(blank=True, verbose_name="Descripcion")

    is_active = models.BooleanField(default=True, verbose_name="Activa")

    objects = TenantAwareManager()

    class Meta:
        verbose_name = "Categoria de Gasto"
        verbose_name_plural = "Categorias de Gastos"
        ordering = ["name"]
        unique_together = [["tenant", "slug"]]
        indexes = [
            models.Index(fields=["tenant", "is_active"]),
            models.Index(fields=["tenant", "slug"]),
        ]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        """Auto-generar slug si no existe."""
        if not self.slug:
            from django.utils.text import slugify

            self.slug = slugify(self.name)
        super().save(*args, **kwargs)


# ===================================
# PROVEEDORES
# ===================================


class Supplier(TenantAwareModel):
    """
    Proveedores del negocio.

    Ejemplos:
    - Distribuidora de cosmeticos
    - Proveedor de insumos
    - Empresa de limpieza
    """

    name = models.CharField(max_length=300, verbose_name="Nombre del proveedor")

    tax_id = models.CharField(
        max_length=50,
        blank=True,
        verbose_name="NIT / RUT / CIF",
        help_text="Identificacion fiscal del proveedor",
    )

    email = models.EmailField(blank=True, verbose_name="Email")

    phone = models.CharField(max_length=30, blank=True, verbose_name="Telefono")

    address = models.TextField(blank=True, verbose_name="Direccion")

    city = models.CharField(max_length=100, blank=True, verbose_name="Ciudad")

    country = models.CharField(max_length=100, blank=True, verbose_name="Pais")

    notes = models.TextField(blank=True, verbose_name="Notas internas")

    is_active = models.BooleanField(default=True, verbose_name="Activo")

    objects = TenantAwareManager()

    class Meta:
        verbose_name = "Proveedor"
        verbose_name_plural = "Proveedores"
        ordering = ["name"]
        indexes = [
            models.Index(fields=["tenant", "is_active"]),
            models.Index(fields=["tenant", "name"]),
        ]

    def __str__(self):
        return self.name


# ===================================
# ORDENES DE COMPRA
# ===================================


class PurchaseOrder(TenantAwareModel):
    """
    Orden de compra a un proveedor.

    Numeracion automatica: OC-YYYYMM-NNN (ej: OC-202604-001)
    """

    STATUS_CHOICES = [
        ("draft", "Borrador"),
        ("sent", "Enviada"),
        ("partial", "Recibida Parcialmente"),
        ("received", "Recibida"),
        ("cancelled", "Cancelada"),
    ]

    supplier = models.ForeignKey(
        Supplier,
        on_delete=models.PROTECT,
        related_name="purchase_orders",
        verbose_name="Proveedor",
    )

    order_number = models.CharField(
        max_length=20,
        blank=True,
        verbose_name="Numero de orden",
        help_text="Se genera automaticamente: OC-YYYYMM-NNN",
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="draft",
        verbose_name="Estado",
    )

    subtotal = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0"),
        validators=[MinValueValidator(Decimal("0"))],
        verbose_name="Subtotal",
    )

    tax_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal("0"),
        validators=[MinValueValidator(Decimal("0"))],
        verbose_name="Tasa de impuesto (%)",
    )

    tax_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0"),
        validators=[MinValueValidator(Decimal("0"))],
        verbose_name="Monto de impuesto",
    )

    total = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0"),
        validators=[MinValueValidator(Decimal("0"))],
        verbose_name="Total",
    )

    notes = models.TextField(blank=True, verbose_name="Notas")

    ordered_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Fecha de orden",
    )

    received_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Fecha de recepcion",
    )

    expected_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Fecha esperada de entrega",
    )

    objects = TenantAwareManager()

    class Meta:
        verbose_name = "Orden de Compra"
        verbose_name_plural = "Ordenes de Compra"
        ordering = ["-created_at"]
        unique_together = [["tenant", "order_number"]]
        indexes = [
            models.Index(fields=["tenant", "status"]),
            models.Index(fields=["tenant", "supplier"]),
            models.Index(fields=["tenant", "ordered_at"]),
        ]

    def __str__(self):
        return f"{self.order_number} - {self.supplier.name}"

    def save(self, *args, **kwargs):
        """Generar numero de orden automatico si no existe."""
        if not self.order_number:
            self.order_number = self._generate_order_number()
        super().save(*args, **kwargs)

    @classmethod
    def _generate_order_number(cls) -> str:
        """
        Genera el siguiente numero secuencial para ordenes de compra.

        Formato: OC-YYYYMM-NNN
        Usa select_for_update para prevenir condiciones de carrera.
        """
        now = timezone.now()
        prefix = f"OC-{now.strftime('%Y%m')}-"

        last_order = (
            cls.objects.filter(order_number__startswith=prefix)
            .select_for_update()
            .order_by("-order_number")
            .first()
        )

        if last_order:
            last_seq = int(last_order.order_number.split("-")[-1])
            next_seq = last_seq + 1
        else:
            next_seq = 1

        return f"{prefix}{next_seq:03d}"


class PurchaseOrderItem(TenantAwareModel):
    """
    Linea de item dentro de una orden de compra.
    """

    purchase_order = models.ForeignKey(
        PurchaseOrder,
        on_delete=models.CASCADE,
        related_name="items",
        verbose_name="Orden de compra",
    )

    product = models.ForeignKey(
        "ecommerce.Product",
        on_delete=models.PROTECT,
        related_name="purchase_order_items",
        verbose_name="Producto",
    )

    quantity = models.PositiveIntegerField(
        default=1,
        validators=[MinValueValidator(1)],
        verbose_name="Cantidad",
    )

    unit_cost = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0"))],
        verbose_name="Costo unitario",
    )

    total = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0"),
        verbose_name="Total",
    )

    objects = TenantAwareManager()

    class Meta:
        verbose_name = "Item de Orden de Compra"
        verbose_name_plural = "Items de Orden de Compra"
        ordering = ["id"]
        indexes = [
            models.Index(fields=["tenant", "purchase_order"]),
            models.Index(fields=["tenant", "product"]),
        ]

    def __str__(self):
        return f"{self.product.name} x{self.quantity}"

    def save(self, *args, **kwargs):
        """Calcular total automaticamente."""
        self.total = self.quantity * self.unit_cost
        super().save(*args, **kwargs)


# ===================================
# MOVIMIENTOS DE INVENTARIO
# ===================================


class InventoryMovement(TenantAwareModel):
    """
    Registro de movimientos de inventario.

    Cada entrada, salida o ajuste se registra como un movimiento
    para tener trazabilidad completa del stock.
    """

    MOVEMENT_TYPE_CHOICES = [
        ("in", "Entrada"),
        ("out", "Salida"),
        ("adjust", "Ajuste"),
    ]

    REFERENCE_TYPE_CHOICES = [
        ("purchase", "Compra"),
        ("sale", "Venta"),
        ("adjustment", "Ajuste Manual"),
        ("return", "Devolucion"),
        ("initial", "Stock Inicial"),
    ]

    product = models.ForeignKey(
        "ecommerce.Product",
        on_delete=models.PROTECT,
        related_name="inventory_movements",
        verbose_name="Producto",
    )

    movement_type = models.CharField(
        max_length=10,
        choices=MOVEMENT_TYPE_CHOICES,
        verbose_name="Tipo de movimiento",
    )

    quantity = models.IntegerField(
        validators=[MinValueValidator(1)],
        verbose_name="Cantidad",
    )

    reference_type = models.CharField(
        max_length=20,
        choices=REFERENCE_TYPE_CHOICES,
        verbose_name="Tipo de referencia",
    )

    reference_number = models.CharField(
        max_length=50,
        blank=True,
        verbose_name="Numero de referencia",
        help_text="Ej: numero de orden de compra o venta",
    )

    notes = models.TextField(blank=True, verbose_name="Notas")

    moved_at = models.DateTimeField(
        default=timezone.now,
        verbose_name="Fecha del movimiento",
    )

    objects = TenantAwareManager()

    class Meta:
        verbose_name = "Movimiento de Inventario"
        verbose_name_plural = "Movimientos de Inventario"
        ordering = ["-moved_at"]
        indexes = [
            models.Index(fields=["tenant", "product"]),
            models.Index(fields=["tenant", "movement_type"]),
            models.Index(fields=["tenant", "moved_at"]),
            models.Index(fields=["tenant", "reference_type"]),
        ]

    def __str__(self):
        return f"{self.get_movement_type_display()} - {self.product.name} x{self.quantity}"


# ===================================
# VENTAS
# ===================================


class Sale(TenantAwareModel):
    """
    Venta realizada por el negocio.

    Numeracion automatica: VTA-YYYYMM-NNN (ej: VTA-202604-001)
    """

    STATUS_CHOICES = [
        ("draft", "Borrador"),
        ("confirmed", "Confirmada"),
        ("completed", "Completada"),
        ("cancelled", "Cancelada"),
    ]

    PAYMENT_METHOD_CHOICES = [
        ("cash", "Efectivo"),
        ("transfer", "Transferencia"),
        ("card", "Tarjeta"),
        ("credit", "Credito"),
        ("other", "Otro"),
    ]

    sale_number = models.CharField(
        max_length=20,
        blank=True,
        verbose_name="Numero de venta",
        help_text="Se genera automaticamente: VTA-YYYYMM-NNN",
    )

    customer_name = models.CharField(
        max_length=300,
        blank=True,
        verbose_name="Nombre del cliente",
    )

    customer_email = models.EmailField(blank=True, verbose_name="Email del cliente")

    customer_phone = models.CharField(
        max_length=30,
        blank=True,
        verbose_name="Telefono del cliente",
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="draft",
        verbose_name="Estado",
    )

    payment_method = models.CharField(
        max_length=20,
        choices=PAYMENT_METHOD_CHOICES,
        default="cash",
        verbose_name="Metodo de pago",
    )

    subtotal = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0"),
        validators=[MinValueValidator(Decimal("0"))],
        verbose_name="Subtotal",
    )

    tax_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal("0"),
        validators=[MinValueValidator(Decimal("0"))],
        verbose_name="Tasa de impuesto (%)",
    )

    tax_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0"),
        validators=[MinValueValidator(Decimal("0"))],
        verbose_name="Monto de impuesto",
    )

    total = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0"),
        validators=[MinValueValidator(Decimal("0"))],
        verbose_name="Total",
    )

    notes = models.TextField(blank=True, verbose_name="Notas")

    sold_at = models.DateTimeField(
        default=timezone.now,
        verbose_name="Fecha de venta",
    )

    paid_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Fecha de pago",
    )

    objects = TenantAwareManager()

    class Meta:
        verbose_name = "Venta"
        verbose_name_plural = "Ventas"
        ordering = ["-sold_at"]
        unique_together = [["tenant", "sale_number"]]
        indexes = [
            models.Index(fields=["tenant", "status"]),
            models.Index(fields=["tenant", "sold_at"]),
            models.Index(fields=["tenant", "payment_method"]),
        ]

    def __str__(self):
        return f"{self.sale_number} - ${self.total:,.0f}"

    def save(self, *args, **kwargs):
        """Generar numero de venta automatico si no existe."""
        if not self.sale_number:
            self.sale_number = self._generate_sale_number()
        super().save(*args, **kwargs)

    @classmethod
    def _generate_sale_number(cls) -> str:
        """
        Genera el siguiente numero secuencial para ventas.

        Formato: VTA-YYYYMM-NNN
        Usa select_for_update para prevenir condiciones de carrera.
        """
        now = timezone.now()
        prefix = f"VTA-{now.strftime('%Y%m')}-"

        last_sale = (
            cls.objects.filter(sale_number__startswith=prefix)
            .select_for_update()
            .order_by("-sale_number")
            .first()
        )

        if last_sale:
            last_seq = int(last_sale.sale_number.split("-")[-1])
            next_seq = last_seq + 1
        else:
            next_seq = 1

        return f"{prefix}{next_seq:03d}"


class SaleItem(TenantAwareModel):
    """
    Linea de item dentro de una venta.
    """

    sale = models.ForeignKey(
        Sale,
        on_delete=models.CASCADE,
        related_name="items",
        verbose_name="Venta",
    )

    product = models.ForeignKey(
        "ecommerce.Product",
        on_delete=models.PROTECT,
        related_name="sale_items",
        verbose_name="Producto",
    )

    quantity = models.PositiveIntegerField(
        default=1,
        validators=[MinValueValidator(1)],
        verbose_name="Cantidad",
    )

    unit_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0"))],
        verbose_name="Precio unitario",
    )

    cost_price_at_sale = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal("0"))],
        verbose_name="Costo al momento de la venta",
        help_text="Se registra para calcular margen de ganancia",
    )

    total = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0"),
        verbose_name="Total",
    )

    objects = TenantAwareManager()

    class Meta:
        verbose_name = "Item de Venta"
        verbose_name_plural = "Items de Venta"
        ordering = ["id"]
        indexes = [
            models.Index(fields=["tenant", "sale"]),
            models.Index(fields=["tenant", "product"]),
        ]

    def __str__(self):
        return f"{self.product.name} x{self.quantity}"

    def save(self, *args, **kwargs):
        """Calcular total automaticamente."""
        self.total = self.quantity * self.unit_price
        super().save(*args, **kwargs)


# ===================================
# GASTOS
# ===================================


class Expense(TenantAwareModel):
    """
    Gastos del negocio.

    Permite registrar gastos clasificados por categoria y proveedor.
    """

    PAYMENT_METHOD_CHOICES = [
        ("cash", "Efectivo"),
        ("transfer", "Transferencia"),
        ("card", "Tarjeta"),
        ("credit", "Credito"),
        ("other", "Otro"),
    ]

    category = models.ForeignKey(
        ExpenseCategory,
        on_delete=models.PROTECT,
        related_name="expenses",
        verbose_name="Categoria",
    )

    supplier = models.ForeignKey(
        Supplier,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="expenses",
        verbose_name="Proveedor",
    )

    description = models.CharField(max_length=500, verbose_name="Descripcion")

    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"))],
        verbose_name="Monto",
    )

    date = models.DateField(
        default=date.today,
        verbose_name="Fecha del gasto",
    )

    payment_method = models.CharField(
        max_length=20,
        choices=PAYMENT_METHOD_CHOICES,
        default="cash",
        verbose_name="Metodo de pago",
    )

    reference_number = models.CharField(
        max_length=100,
        blank=True,
        verbose_name="Numero de referencia",
        help_text="Numero de factura, recibo, etc.",
    )

    notes = models.TextField(blank=True, verbose_name="Notas")

    objects = TenantAwareManager()

    class Meta:
        verbose_name = "Gasto"
        verbose_name_plural = "Gastos"
        ordering = ["-date"]
        indexes = [
            models.Index(fields=["tenant", "category"]),
            models.Index(fields=["tenant", "supplier"]),
            models.Index(fields=["tenant", "date"]),
            models.Index(fields=["tenant", "payment_method"]),
        ]

    def __str__(self):
        return f"{self.description} - ${self.amount:,.0f}"
