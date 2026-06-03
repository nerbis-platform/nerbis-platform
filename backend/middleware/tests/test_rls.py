from unittest.mock import MagicMock, patch

import pytest

from middleware.rls import RLSTenantMiddleware


@pytest.fixture
def make_middleware():
    def _make(response=None):
        if response is None:
            response = MagicMock(status_code=200)
        get_response = MagicMock(return_value=response)
        return RLSTenantMiddleware(get_response), get_response

    return _make


@pytest.fixture
def tenant():
    t = MagicMock()
    t.id = "550e8400-e29b-41d4-a716-446655440000"
    return t


class TestRLSTenantMiddleware:
    @patch("middleware.rls.connection")
    def test_sets_tenant_id_on_request(self, mock_conn, make_middleware, tenant):
        """SET se ejecuta cuando hay tenant valido."""
        mw, get_response = make_middleware()
        request = MagicMock(tenant=tenant, tenant_excluded=False)

        mock_cursor = MagicMock()
        mock_conn.cursor.return_value.__enter__ = MagicMock(return_value=mock_cursor)
        mock_conn.cursor.return_value.__exit__ = MagicMock(return_value=False)
        mock_conn.connection = MagicMock()  # conexion activa

        mw(request)

        # Verificar SET
        calls = mock_cursor.execute.call_args_list
        assert any("set_config" in str(c) and str(tenant.id) in str(c) for c in calls)
        # Verificar RESET
        assert any("RESET" in str(c) for c in calls)
        # Verificar que get_response se llamo
        get_response.assert_called_once_with(request)

    @patch("middleware.rls.connection")
    def test_skips_when_tenant_excluded(self, mock_conn, make_middleware, tenant):
        """No hace SET si la ruta esta excluida."""
        mw, get_response = make_middleware()
        request = MagicMock(tenant=tenant, tenant_excluded=True)

        mw(request)

        mock_conn.cursor.assert_not_called()
        get_response.assert_called_once_with(request)

    @patch("middleware.rls.connection")
    def test_skips_when_no_tenant(self, mock_conn, make_middleware):
        """No hace SET si no hay tenant."""
        mw, get_response = make_middleware()
        request = MagicMock(spec=[])  # sin atributo tenant

        mw(request)

        mock_conn.cursor.assert_not_called()
        get_response.assert_called_once_with(request)

    @patch("middleware.rls.connection")
    def test_resets_on_view_exception(self, mock_conn, make_middleware, tenant):
        """RESET se ejecuta incluso si la view lanza excepcion."""
        get_response = MagicMock(side_effect=RuntimeError("view crash"))
        mw = RLSTenantMiddleware(get_response)
        request = MagicMock(tenant=tenant, tenant_excluded=False)

        mock_cursor = MagicMock()
        mock_conn.cursor.return_value.__enter__ = MagicMock(return_value=mock_cursor)
        mock_conn.cursor.return_value.__exit__ = MagicMock(return_value=False)
        mock_conn.connection = MagicMock()

        with pytest.raises(RuntimeError, match="view crash"):
            mw(request)

        # RESET debe haberse ejecutado a pesar de la excepcion
        calls = mock_cursor.execute.call_args_list
        assert any("RESET" in str(c) for c in calls)

    @patch("middleware.rls.connection")
    def test_skips_reset_when_no_db_connection(self, mock_conn, make_middleware, tenant):
        """No intenta RESET si no hay conexion fisica a la DB."""
        mw, get_response = make_middleware()
        request = MagicMock(tenant=tenant, tenant_excluded=False)

        mock_cursor = MagicMock()
        mock_conn.cursor.return_value.__enter__ = MagicMock(return_value=mock_cursor)
        mock_conn.cursor.return_value.__exit__ = MagicMock(return_value=False)
        mock_conn.connection = None  # sin conexion fisica

        mw(request)

        # Solo SET, no RESET (porque connection es None)
        calls = mock_cursor.execute.call_args_list
        assert any("set_config" in str(c) for c in calls)
        # RESET no se ejecuto porque connection es None
        assert not any("RESET" in str(c) for c in calls)
