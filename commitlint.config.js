// Configuración de Conventional Commits para ECO-GRAVITI
// Docs: https://commitlint.js.org/
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Tipos permitidos
    'type-enum': [
      2, // error (no warning)
      'always',
      [
        'feat',     // Nueva funcionalidad
        'fix',      // Corrección de bug
        'docs',     // Solo documentación
        'style',    // Formato, espacios (no cambia lógica)
        'refactor', // Reestructuración sin cambiar comportamiento
        'test',     // Agregar o corregir tests
        'chore',    // Mantenimiento (deps, config, CI)
        'perf',     // Mejora de rendimiento
        'ci',       // Cambios en CI/CD
        'build',    // Cambios en sistema de build
        'revert',   // Revertir commit anterior
      ],
    ],
    // Scopes permitidos (módulos del proyecto)
    'scope-enum': [
      2,
      'always',
      [
        'backend',
        'frontend',
        'mobile',
        'infra',
        'docs',
        'core',
        'ecommerce',
        'bookings',
        'services',
        'orders',
        'cart',
        'payments',
        'notifications',
        'subscriptions',
        'billing',
        'reviews',
        'coupons',
        'promotions',
        'websites',
        'auth',
        'admin',
      ],
    ],
    // Scope es obligatorio
    'scope-empty': [2, 'never'],
    // Descripción en minúsculas (no empezar con mayúscula)
    'subject-case': [2, 'always', 'lower-case'],
    // Descripción no vacía
    'subject-empty': [2, 'never'],
    // Máximo 72 caracteres en el subject
    'header-max-length': [2, 'always', 72],
  },
};
