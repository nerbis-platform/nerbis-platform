// src/app/dashboard/contracts/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Calendar, Package, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { apiClient } from '@/lib/api/client';
import { toast } from 'sonner';
import type { SubscriptionContract } from '@/types';

export default function ContractsPage() {
  const [contracts, setContracts] = useState<SubscriptionContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelingId, setCancelingId] = useState<number | null>(null);
  const [contractToCancel, setContractToCancel] = useState<SubscriptionContract | null>(null);

  useEffect(() => {
    fetchContracts();
  }, []);

  const fetchContracts = async () => {
    try {
      const response = await apiClient.get<SubscriptionContract[]>('/subscriptions/contracts/');
      setContracts(response.data);
    } catch (error) {
      console.error('Error loading contracts:', error);
      toast.error('Error al cargar contratos');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelContract = async () => {
    if (!contractToCancel) return;

    setCancelingId(contractToCancel.id);
    try {
      await apiClient.post(`/subscriptions/contracts/${contractToCancel.id}/cancel/`);
      toast.success('Contrato cancelado exitosamente');
      fetchContracts(); // Refresh list
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      const errorMessage = err.response?.data?.error || 'Error al cancelar contrato';
      toast.error(errorMessage);
    } finally {
      setCancelingId(null);
      setContractToCancel(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 hover:bg-green-100';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100';
      case 'suspended':
        return 'bg-orange-100 text-orange-800 hover:bg-orange-100';
      case 'cancelled':
        return 'bg-red-100 text-red-800 hover:bg-red-100';
      case 'expired':
        return 'bg-gray-100 text-gray-800 hover:bg-gray-100';
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-100';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'Activo';
      case 'pending':
        return 'Pendiente';
      case 'suspended':
        return 'Suspendido';
      case 'cancelled':
        return 'Cancelado';
      case 'expired':
        return 'Expirado';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando contratos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Mis Contratos</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona tus servicios y suscripciones activas
          </p>
        </div>
        <Link href="/plans">
          <Button>Ver más servicios</Button>
        </Link>
      </div>

      {/* Contracts List */}
      {contracts.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">No tienes contratos activos</h2>
            <p className="text-muted-foreground mb-6">
              Explora nuestros servicios y planes disponibles
            </p>
            <Link href="/plans">
              <Button>Explorar servicios</Button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {contracts.map((contract) => (
            <Card key={contract.id} className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-semibold">{contract.service_plan_name}</h3>
                    <Badge className={getStatusColor(contract.status)}>
                      {getStatusText(contract.status)}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Contrato #{contract.id}
                  </p>
                </div>

                {contract.status === 'active' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setContractToCancel(contract)}
                    disabled={cancelingId === contract.id}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Cancelar
                  </Button>
                )}
              </div>

              <Separator className="my-4" />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Start Date */}
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Fecha de inicio</div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">
                      {new Date(contract.start_date).toLocaleDateString('es-ES')}
                    </span>
                  </div>
                </div>

                {/* End Date */}
                {contract.end_date && (
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Fecha de fin</div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {new Date(contract.end_date).toLocaleDateString('es-ES')}
                      </span>
                    </div>
                  </div>
                )}

                {/* Next Billing */}
                {contract.next_billing_date && contract.status === 'active' && (
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Próximo cobro</div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {new Date(contract.next_billing_date).toLocaleDateString('es-ES')}
                      </span>
                    </div>
                  </div>
                )}

                {/* Price Paid */}
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Precio pagado</div>
                  <div className="font-medium text-lg">
                    ${parseFloat(contract.price_paid).toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Days Remaining */}
              {contract.status === 'active' && contract.days_remaining !== undefined && contract.days_remaining !== null && (
                <div className="mt-4 flex items-center gap-2 text-sm">
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {contract.days_remaining > 0
                      ? `${contract.days_remaining} días restantes`
                      : 'Servicio vitalicio'
                    }
                  </span>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={!!contractToCancel} onOpenChange={(open) => !open && setContractToCancel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cancelar contrato?</AlertDialogTitle>
            <AlertDialogDescription>
              Estás a punto de cancelar el contrato de <strong>{contractToCancel?.service_plan_name}</strong>.
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, mantener</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelContract}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Sí, cancelar contrato
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
