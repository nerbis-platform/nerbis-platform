/**
 * Calculador de precio anual para Planes
 *
 * Actualiza en tiempo real el campo "Precio Anual (calculado)" cuando
 * se modifican el precio mensual o los meses de descuento.
 */
(function() {
    'use strict';

    document.addEventListener('DOMContentLoaded', function() {
        // Campos de entrada
        const monthlyPriceInput = document.getElementById('id_monthly_price');
        const discountMonthsInput = document.getElementById('id_annual_discount_months');
        // Contenedor del resultado
        const yearlyDisplay = document.getElementById('yearly-price-display');

        // Si no existen los campos, no estamos en el formulario de Plan
        if (!monthlyPriceInput || !discountMonthsInput || !yearlyDisplay) {
            return;
        }

        /**
         * Formatea un número como moneda colombiana
         */
        function formatCurrency(value) {
            return '$' + value.toLocaleString('es-CO', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            });
        }

        /**
         * Calcula y actualiza el precio anual
         */
        function updateYearlyPrice() {
            // Obtener valores
            const monthlyPrice = parseFloat(monthlyPriceInput.value) || 0;
            const discountMonths = parseInt(discountMonthsInput.value) || 0;

            // Validar
            if (monthlyPrice <= 0) {
                yearlyDisplay.innerHTML = '<em style="color: #6b7280;">Ingresa un precio mensual</em>';
                return;
            }

            if (discountMonths < 0 || discountMonths > 11) {
                yearlyDisplay.innerHTML = '<em style="color: #ef4444;">Los meses de descuento deben ser entre 0 y 11</em>';
                return;
            }

            // Calcular
            const monthsToPay = 12 - discountMonths;
            const yearlyPrice = monthlyPrice * monthsToPay;
            const fullYearPrice = monthlyPrice * 12;
            const savings = fullYearPrice - yearlyPrice;
            const discountPercent = ((discountMonths / 12) * 100).toFixed(0);

            // Actualizar display
            yearlyDisplay.innerHTML =
                '<strong style="color: #059669; font-size: 1.1em;">' + formatCurrency(yearlyPrice) + '/año</strong><br>' +
                '<span style="color: #6b7280; font-size: 0.9em;">Ahorro: ' + formatCurrency(savings) +
                ' (' + discountPercent + '% - ' + discountMonths + ' meses gratis)</span>';
        }

        // Escuchar cambios en ambos campos
        monthlyPriceInput.addEventListener('input', updateYearlyPrice);
        monthlyPriceInput.addEventListener('change', updateYearlyPrice);
        discountMonthsInput.addEventListener('input', updateYearlyPrice);
        discountMonthsInput.addEventListener('change', updateYearlyPrice);

        // Calcular al cargar (por si ya hay valores)
        updateYearlyPrice();
    });
})();
