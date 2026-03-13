import { useState, useEffect, useCallback } from 'react';

/**
 * Hook para cargar la lista de trabajadores desde el módulo de trabajadores.
 */
export function useTrabajadoresData() {
  const [trabajadores, setTrabajadores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadTrabajadores = useCallback(async () => {
    try {
      const response = await fetch('/api/trabajadoreskrsft/list?estado=Activo');
      const result = await response.json();

      if (result.success) {
        // The API returns either 'trabajadores' or 'workers'
        setTrabajadores(result.trabajadores || result.workers || []);
        setError(null);
      } else {
        setError(result.message || 'Error al cargar trabajadores');
      }
    } catch (err) {
      setError(err.message || 'Error de conexión al cargar trabajadores');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTrabajadores();
  }, [loadTrabajadores]);

  return { trabajadores, loading, error, reload: loadTrabajadores };
}
