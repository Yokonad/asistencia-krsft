import { useState, useEffect, useCallback } from 'react';
import { POLLING_INTERVAL } from '../utils/constants';

const getCsrfToken = () => {
  const meta = document.querySelector('meta[name="csrf-token"]');
  return meta ? meta.content : '';
};

/**
 * Hook para gestionar los datos de asistencia.
 * - loadHoy(): Carga las asistencias registradas en el día
 * - loadAsistencias(): Carga todos los registros de attendance_records
 */
export function useAsistenciaData(auth) {
  const [trabajadoresHoy, setTrabajadoresHoy] = useState([]);
  const [asistencias, setAsistencias] = useState([]);
  const [statsHoy, setStatsHoy] = useState({ total: 0, presentes: 0, ausentes: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ── Cargar vista HOY (workers + attendance merged) ───
  const loadHoy = useCallback(async () => {
    try {
      const response = await fetch('/api/asistenciakrsft/hoy');
      const result = await response.json();

      if (result.success) {
        setTrabajadoresHoy(result.data || []);
        setStatsHoy({
          total: result.total_registros ?? result.total_presentes ?? 0,
          presentes: result.total_presentes || 0,
          ausentes: result.total_ausentes || 0,
        });
        setError(null);
      } else {
        setError(result.message || 'Error al cargar datos de hoy');
      }
    } catch (err) {
      setError(err.message || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Cargar todos los registros (para la vista ASISTENCIAS) ───
  const loadAsistencias = useCallback(async (params = {}) => {
    try {
      const searchParams = new URLSearchParams(params).toString();
      const response = await fetch(`/api/asistenciakrsft/list?${searchParams}`);
      const result = await response.json();

      if (result.success) {
        setAsistencias(result.data || []);
        setError(null);
      }
    } catch (err) {
      setError(err.message || 'Error de conexión');
    }
  }, []);

  // ── Registrar asistencia por DNI ───
  const createAsistencia = useCallback(async (payload) => {
    try {
      const response = await fetch('/api/asistenciakrsft/store', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': getCsrfToken(),
        },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (result.success) {
        await loadHoy(); // Refresh HOY view
        return { success: true, message: result.message };
      }
      return { success: false, message: result.message || 'Error al crear registro' };
    } catch (err) {
      return { success: false, message: err.message || 'Error de conexión' };
    }
  }, [loadHoy]);

  const updateAsistencia = useCallback(async (id, payload) => {
    try {
      const response = await fetch(`/api/asistenciakrsft/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': getCsrfToken(),
        },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (result.success) {
        await loadHoy();
        return { success: true, message: result.message };
      }
      return { success: false, message: result.message || 'Error al actualizar registro' };
    } catch (err) {
      return { success: false, message: err.message || 'Error de conexión' };
    }
  }, [loadHoy]);

  const deleteAsistencia = useCallback(async (id) => {
    try {
      const response = await fetch(`/api/asistenciakrsft/${id}`, {
        method: 'DELETE',
        headers: {
          'X-CSRF-TOKEN': getCsrfToken(),
        },
      });
      const result = await response.json();
      if (result.success) {
        await loadHoy();
        return { success: true, message: result.message };
      }
      return { success: false, message: result.message || 'Error al eliminar registro' };
    } catch (err) {
      return { success: false, message: err.message || 'Error de conexión' };
    }
  }, [loadHoy]);

  // ── Initial load ───
  useEffect(() => {
    loadHoy();
  }, [loadHoy]);

  // ── Polling (silent refresh) ───
  useEffect(() => {
    const interval = setInterval(() => {
      loadHoy();
    }, POLLING_INTERVAL);

    return () => clearInterval(interval);
  }, [loadHoy]);

  return {
    // HOY view data
    trabajadoresHoy,
    statsHoy,
    // All records (ASISTENCIAS tab)
    asistencias,
    loadAsistencias,
    // State
    loading,
    error,
    // CRUD
    createAsistencia,
    updateAsistencia,
    deleteAsistencia,
  };
}
