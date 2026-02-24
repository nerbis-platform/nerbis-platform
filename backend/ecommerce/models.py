# backend/ecommerce/models.py

from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils.text import slugify
from core.models import TenantAwareModel
from decimal import Decimal


class ProductCategory(TenantAwareModel):
    """
    Categorías de productos.

    Ejemplos:
    - Tratamiento Facial
    - Tratamiento Corporal
    - Cuidado del Cabello
    - Maquillaje
    - Accesorios
    """

    name = models.CharField(max_length=200, verbose_name="Nombre de la categoría")

    slug = models.SlugField(max_length=220, blank=True, verbose_name="Slug")

    description = models.TextField(blank=True, verbose_name="Descripción")

    image = models.ImageField(upload_to="categories/", null=True, blank=True, verbose_name="Imagen de la categoría")

    parent = models.ForeignKey(
        "self",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="subcategories",
        verbose_name="Categoría padre",
        help_text="Para crear subcategorías (opcional)",
    )

    is_active = models.BooleanField(default=True, verbose_name="¿Está activa?")

    order = models.IntegerField(
        default=0, verbose_name="Orden de visualización", help_text="Número menor = aparece primero"
    )

    class Meta:
        verbose_name = "Categoría de Producto"
        verbose_name_plural = "Categorías de Productos"
        ordering = ["order", "name"]
        unique_together = [["tenant", "slug"]]
        indexes = [
            models.Index(fields=["tenant", "is_active"]),
            models.Index(fields=["tenant", "slug"]),
        ]

    def __str__(self):
        if self.parent:
            return f"{self.parent.name} > {self.name}"
        return self.name

    def save(self, *args, **kwargs):
        """Auto-generar slug si no existe"""
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def get_products_count(self):
        """Contar productos en esta categoría"""
        return self.products.filter(is_active=True).count()


class Product(TenantAwareModel):
    """
    Producto a la venta.

    Ejemplos:
    - Crema Hidratante Premium - €45.00
    - Sérum Vitamina C - €39.90
    - Exfoliante Corporal Natural - €28.00
    """

    # Información básica
    name = models.CharField(max_length=300, verbose_name="Nombre del producto")

    slug = models.SlugField(max_length=320, blank=True, verbose_name="Slug")

    sku = models.CharField(max_length=100, blank=True, verbose_name="SKU", help_text="Código interno del producto")

    category = models.ForeignKey(
        ProductCategory, on_delete=models.PROTECT, related_name="products", verbose_name="Categoría"
    )

    # Descripción
    short_description = models.TextField(
        max_length=500, blank=True, verbose_name="Descripción corta", help_text="Texto breve para listados"
    )

    description = models.TextField(
        blank=True, verbose_name="Descripción completa", help_text="Descripción detallada con HTML permitido"
    )

    # Precios
    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"))],
        verbose_name="Precio",
        help_text="Precio de venta al público",
    )

    compare_at_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal("0.01"))],
        verbose_name="Precio de comparación",
        help_text="Precio anterior (para mostrar descuento)",
    )

    cost_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal("0.00"))],
        verbose_name="Precio de costo",
        help_text="Costo de adquisición (no visible al público)",
    )

    # Características
    brand = models.CharField(max_length=200, blank=True, verbose_name="Marca")

    weight = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True, verbose_name="Peso (kg)")

    # Estado
    is_active = models.BooleanField(
        default=True, verbose_name="¿Está activo?", help_text="Producto visible en la tienda"
    )

    is_featured = models.BooleanField(
        default=False, verbose_name="¿Es destacado?", help_text="Mostrar en sección destacados"
    )

    requires_shipping = models.BooleanField(
        default=True, verbose_name="¿Requiere envío?", help_text="Desactivar para productos digitales"
    )

    # SEO
    meta_title = models.CharField(max_length=200, blank=True, verbose_name="Meta título")

    meta_description = models.TextField(max_length=320, blank=True, verbose_name="Meta descripción")

    average_rating = models.DecimalField(
        max_digits=3,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(5)],
        verbose_name="Rating promedio",
    )

    reviews_count = models.PositiveIntegerField(default=0, verbose_name="Cantidad de reviews")

    class Meta:
        verbose_name = "Producto"
        verbose_name_plural = "Productos"
        ordering = ["-created_at"]
        unique_together = [["tenant", "slug"]]
        indexes = [
            models.Index(fields=["tenant", "is_active", "category"]),
            models.Index(fields=["tenant", "slug"]),
            models.Index(fields=["tenant", "is_featured"]),
        ]

    def __str__(self):
        return f"{self.name} - €{self.price}"

    def save(self, *args, **kwargs):
        """Auto-generar slug y SKU si no existen"""
        if not self.slug:
            self.slug = slugify(self.name)

        if not self.sku:
            # Generar SKU automático: TENANT-CATEGORY-ID
            self.sku = f"{self.tenant.slug[:3].upper()}-{self.category.slug[:3].upper()}"

        super().save(*args, **kwargs)

    @property
    def discount_percentage(self):
        """Calcular porcentaje de descuento"""
        if self.compare_at_price and self.compare_at_price > self.price:
            discount = ((self.compare_at_price - self.price) / self.compare_at_price) * 100
            return round(discount, 0)
        return 0

    @property
    def is_in_stock(self):
        """Verificar si hay stock"""
        try:
            return self.inventory.stock > 0
        except:
            return False

    @property
    def main_image(self):
        """Obtener imagen principal"""
        return self.images.filter(is_primary=True).first() or self.images.first()


class ProductImage(TenantAwareModel):
    """
    Imágenes de productos.

    Un producto puede tener múltiples imágenes.
    """

    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="images", verbose_name="Producto")

    image = models.ImageField(upload_to="products/", verbose_name="Imagen")

    alt_text = models.CharField(
        max_length=200, blank=True, verbose_name="Texto alternativo", help_text="Descripción de la imagen para SEO"
    )

    is_primary = models.BooleanField(
        default=False, verbose_name="¿Es imagen principal?", help_text="Solo una imagen debe ser principal"
    )

    order = models.IntegerField(default=0, verbose_name="Orden")

    class Meta:
        verbose_name = "Imagen de Producto"
        verbose_name_plural = "Imágenes de Productos"
        ordering = ["-is_primary", "order"]
        indexes = [
            models.Index(fields=["tenant", "product"]),
        ]

    def __str__(self):
        return f"Imagen {self.order} - {self.product.name}"

    def save(self, *args, **kwargs):
        """Si es primaria, quitar flag de las demás"""
        if self.is_primary:
            # Quitar is_primary de otras imágenes del mismo producto
            ProductImage.objects.filter(product=self.product, is_primary=True).exclude(pk=self.pk).update(
                is_primary=False
            )

        super().save(*args, **kwargs)


class Inventory(TenantAwareModel):
    """
    Control de inventario por producto.

    Cada producto tiene UN registro de inventario.
    """

    product = models.OneToOneField(Product, on_delete=models.CASCADE, related_name="inventory", verbose_name="Producto")

    stock = models.IntegerField(
        default=0,
        validators=[MinValueValidator(0)],
        verbose_name="Stock disponible",
        help_text="Cantidad actual en inventario",
    )

    low_stock_threshold = models.IntegerField(
        default=5,
        validators=[MinValueValidator(0)],
        verbose_name="Umbral de stock bajo",
        help_text="Alerta cuando el stock baje de este número",
    )

    track_inventory = models.BooleanField(
        default=True, verbose_name="¿Controlar inventario?", help_text="Desactivar para productos sin límite de stock"
    )

    allow_backorders = models.BooleanField(
        default=False, verbose_name="¿Permitir pre-pedidos?", help_text="Permitir ventas cuando no hay stock"
    )

    # Historial
    total_sold = models.IntegerField(
        default=0, verbose_name="Total vendido", help_text="Cantidad vendida desde el inicio"
    )

    last_restock_date = models.DateTimeField(null=True, blank=True, verbose_name="Última reposición")

    last_restock_quantity = models.IntegerField(default=0, verbose_name="Cantidad última reposición")

    class Meta:
        verbose_name = "Inventario"
        verbose_name_plural = "Inventarios"
        indexes = [
            models.Index(fields=["tenant", "stock"]),
        ]

    def __str__(self):
        return f"{self.product.name} - Stock: {self.stock}"

    @property
    def is_low_stock(self):
        """Verificar si el stock está bajo"""
        if not self.track_inventory:
            return False
        return self.stock <= self.low_stock_threshold

    @property
    def is_out_of_stock(self):
        """Verificar si no hay stock"""
        if not self.track_inventory:
            return False
        return self.stock <= 0

    def can_purchase(self, quantity=1):
        """Verificar si se puede comprar cierta cantidad"""
        if not self.track_inventory:
            return True

        if self.allow_backorders:
            return True

        return self.stock >= quantity

    def decrease_stock(self, quantity):
        """Reducir stock después de una venta"""
        if self.track_inventory:
            self.stock -= quantity
            self.total_sold += quantity
            self.save()

    def increase_stock(self, quantity):
        """Aumentar stock (reposición)"""
        from django.utils import timezone

        self.stock += quantity
        self.last_restock_date = timezone.now()
        self.last_restock_quantity = quantity
        self.save()
