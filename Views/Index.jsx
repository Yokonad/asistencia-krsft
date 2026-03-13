import { useEffect, useMemo, useState } from 'react';
import { PlusIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useAsistenciaData } from './hooks/useAsistenciaData';
import AsistenciaTable from './Components/AsistenciaTable';
import AsistenciaHeader from './Components/AsistenciaHeader';
import AsistenciaStats from './Components/AsistenciaStats';
import AsistenciaTabBar from './Components/AsistenciaTabBar';
import AsistenciaModal from './Components/AsistenciaModal';
import PrevencionTab from './Components/PrevencionTab';
import PersonasTab from './Components/PersonasTab';
import ProyectosTab from './Components/ProyectosTab';
import Button from './Components/ui/Button';
import CustomSelect from './Components/ui/CustomSelect';
import CustomDatePicker from './Components/ui/CustomDatePicker';

export default function Index({ auth }) {
  const {
    trabajadoresHoy,
    statsHoy,
    asistencias,
    loading,
    createAsistencia,
    updateAsistencia,
    deleteAsistencia,
    loadAsistencias,
  } = useAsistenciaData(auth);

  const [toast, setToast] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingAsistencia, setEditingAsistencia] = useState(null);
  const [activeTab, setActiveTab] = useState('hoy');
  const [searchTerm, setSearchTerm] = useState('');

  const today = new Date().toISOString().split('T')[0];
  const [selectedCargo, setSelectedCargo] = useState('Todas');
  const [selectedStatus, setSelectedStatus] = useState('Todos');
  const [selectedOrigin, setSelectedOrigin] = useState('Todos');
  const [searchAsistencias, setSearchAsistencias] = useState('');

  // Rango de fechas para la pestaña ASISTENCIAS (default: primer día del mes actual → hoy)
  const [fechaDesde, setFechaDesde] = useState(() => today.substring(0, 8) + '01');
  const [fechaHasta, setFechaHasta] = useState(today);

  const [personasCount, setPersonasCount] = useState(0);
  const [proyectosCount, setProyectosCount] = useState(0);

  // Fetch ligero solo para badges (counts instantáneos)
  useEffect(() => {
    fetch('/api/asistenciakrsft/counts')
      .then(r => r.json())
      .then(data => {
        if (data.personas) setPersonasCount(data.personas);
        if (data.proyectos) setProyectosCount(data.proyectos);
      })
      .catch(() => {});
  }, []);

  const tabCounts = useMemo(() => ({
    hoy: statsHoy.total,
    total: asistencias.length,
    prevencion: 0,
    personas: personasCount,
    proyectos: proyectosCount,
  }), [statsHoy, asistencias, personasCount, proyectosCount]);

  const rangeLabel = useMemo(() => {
    if (!fechaDesde && !fechaHasta) return '';
    const fmt = (d) => {
      const [y, m, day] = d.split('-');
      return `${day}/${m}/${y}`;
    };
    if (fechaDesde && fechaHasta) return `${fmt(fechaDesde)} — ${fmt(fechaHasta)}`;
    if (fechaDesde) return `Desde ${fmt(fechaDesde)}`;
    return `Hasta ${fmt(fechaHasta)}`;
  }, [fechaDesde, fechaHasta]);

  const cargoOptions = useMemo(() => {
    const cargos = trabajadoresHoy
      .map((trabajador) => trabajador.cargo)
      .filter(Boolean);

    return ['Todas', ...new Set(cargos)];
  }, [trabajadoresHoy]);

  const filteredAsistencias = useMemo(() => {
    let rows = asistencias;

    if (selectedOrigin === 'Captura app') {
      rows = rows.filter((r) => r.photo_path && r.photo_path !== 'manual-entry');
    } else if (selectedOrigin === 'Registro manual') {
      rows = rows.filter((r) => r.photo_path === 'manual-entry');
    }

    if (searchAsistencias) {
      const term = searchAsistencias.toLowerCase();
      rows = rows.filter(
        (r) =>
          (r.trabajador_nombre || '').toLowerCase().includes(term) ||
          (r.dni || '').includes(term) ||
          (r.cargo || '').toLowerCase().includes(term)
      );
    }

    return rows;
  }, [asistencias, selectedOrigin, searchAsistencias]);

  // Agrupar asistencias filtradas por fecha
  const groupedAsistencias = useMemo(() => {
    const groups = {};
    for (const record of filteredAsistencias) {
      const key = record.fecha || 'Sin fecha';
      if (!groups[key]) groups[key] = [];
      groups[key].push(record);
    }
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  }, [filteredAsistencias]);

  useEffect(() => {
    const params = {};
    if (fechaDesde) params.fecha_desde = fechaDesde;
    if (fechaHasta) params.fecha_hasta = fechaHasta;
    loadAsistencias(params);
  }, [loadAsistencias, fechaDesde, fechaHasta]);

  // Filter workers by search term
  const filteredTrabajadores = useMemo(() => {
    let rows = trabajadoresHoy;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      rows = rows.filter(
        (trabajador) =>
          (trabajador.trabajador_nombre || '').toLowerCase().includes(term) ||
          (trabajador.dni || '').includes(term)
      );
    }

    if (selectedCargo !== 'Todas') {
      rows = rows.filter((trabajador) => (trabajador.cargo || '') === selectedCargo);
    }

    if (selectedStatus === 'Registrado') {
      rows = rows.filter((trabajador) => Boolean(trabajador.id));
    }

    if (selectedStatus === 'Pendiente') {
      rows = rows.filter((trabajador) => !trabajador.id);
    }

    return rows;
  }, [trabajadoresHoy, searchTerm, selectedCargo, selectedStatus]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 1300);
  };

  const handleBack = () => {
    window.history.back();
  };

  const handleOpenCreate = () => {
    setEditingAsistencia(null);
    setShowModal(true);
  };

  const handleOpenEdit = (asistencia) => {
    setEditingAsistencia(asistencia?.id ? asistencia : { ...asistencia, _new: true });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingAsistencia(null);
  };

  const handleSubmit = async (payload) => {
    let result;
    if (editingAsistencia && !editingAsistencia._new) {
      result = await updateAsistencia(editingAsistencia.id, payload);
    } else {
      // For new records or workers without registration
      result = await createAsistencia(payload);
    }

    if (result.success) {
      await loadAsistencias({ fecha_desde: fechaDesde, fecha_hasta: fechaHasta });
      showToast(result.message || (editingAsistencia ? 'Registro actualizado' : 'Registro creado'));
      handleCloseModal();
    }

    return result;
  };

  const handleDelete = async (id) => {
    const result = await deleteAsistencia(id);
    if (result.success) {
      await loadAsistencias({ fecha_desde: fechaDesde, fecha_hasta: fechaHasta });
    }
    showToast(result.message || (result.success ? 'Registro eliminado' : 'No se pudo eliminar'), result.success ? 'success' : 'error');
  };

  const handleExport = () => {
    if (filteredAsistencias.length === 0) {
      showToast('No hay registros para exportar en este período', 'warning');
      return;
    }

    const headers = ['Fecha', 'Hora', 'DNI', 'Trabajador', 'Cargo', 'Origen'];
    const rows = filteredAsistencias.map((record) => [
      record.fecha || '',
      record.hora_entrada || '',
      record.dni || '',
      record.trabajador_nombre || '',
      record.cargo || '',
      record.photo_path === 'manual-entry' ? 'Registro manual' : 'Captura app',
    ]);

    const csv = [headers, ...rows]
      .map((columns) => columns.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `asistencias-${fechaDesde}_${fechaHasta}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="asistencia-scroll-hidden h-screen overflow-y-auto bg-gray-50">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50">
          <div role="alert" className={`rounded-md border p-4 shadow-lg ${
            toast.type === 'success' ? 'bg-green-50 border-green-500' :
            toast.type === 'error'   ? 'bg-red-50 border-red-500' :
                                       'bg-amber-50 border-amber-500'
          }`}>
            <div className="flex items-start gap-4">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5"
                stroke="currentColor"
                className={`size-5 mt-0.5 ${toast.type === 'success' ? 'text-green-700' : toast.type === 'error' ? 'text-red-700' : 'text-amber-700'}`}>
                {toast.type === 'success'
                  ? <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  : <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                }
              </svg>
              <p className={`text-sm font-medium ${toast.type === 'success' ? 'text-green-800' : toast.type === 'error' ? 'text-red-800' : 'text-amber-800'}`}>
                {toast.message}
              </p>
              <button onClick={() => setToast(null)} className="ml-2 text-gray-400 hover:text-gray-600">
                <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="w-full px-12 py-4">
        <div className="space-y-6">
          <AsistenciaHeader onBack={handleBack} onCreate={handleOpenCreate} />

          <AsistenciaStats
            total={statsHoy.total}
            presentes={statsHoy.presentes}
            ausentes={statsHoy.ausentes}
            hoy={statsHoy.presentes}
          />

          <AsistenciaTabBar counts={tabCounts} activeTab={activeTab} setActiveTab={setActiveTab} />

          {/* Contenido dinámico según Tab */}
          {activeTab === 'hoy' && (
            <div className="space-y-6">
              {/* Barra de Filtros (Vista Hoy) */}
              <div className="rounded-lg border border-gray-100 bg-white px-5 py-4 shadow-sm">
                <div className="flex flex-col sm:flex-row items-end gap-3">
                  <div className="relative flex-1 min-w-0">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Buscar</label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" aria-hidden="true" />
                      </div>
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="block w-full rounded-md border border-gray-200 h-[38px] pl-9 pr-3 text-gray-900 placeholder:text-gray-400 focus:border-[#00BFA6] focus:ring-1 focus:ring-[#00BFA6] text-[13px]"
                        placeholder="Buscar por nombre o DNI..."
                      />
                    </div>
                  </div>
                  <div className="w-[140px] shrink-0">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Cargo</label>
                    <CustomSelect 
                      options={cargoOptions}
                      value={selectedCargo}
                      onChange={setSelectedCargo}
                      className="rounded-md border-gray-200 px-3 py-2 text-[13px] bg-white w-full h-[38px]" 
                    />
                  </div>
                  <div className="w-[140px] shrink-0">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Estado</label>
                    <CustomSelect 
                      options={['Todos', 'Registrado', 'Pendiente']}
                      value={selectedStatus}
                      onChange={setSelectedStatus}
                      className="rounded-md border-gray-200 px-3 py-2 text-[13px] bg-white w-full h-[38px]" 
                    />
                  </div>
                  <Button
                    variant="primary"
                    size="md"
                    onClick={handleOpenCreate}
                    className="gap-2 shadow-sm whitespace-nowrap shrink-0 h-[38px] px-4"
                  >
                    <PlusIcon className="size-4 stroke-2" />
                    Nueva Asistencia
                  </Button>
                </div>
              </div>

              <AsistenciaTable
                asistencias={filteredTrabajadores}
                loading={loading}
                onEdit={handleOpenEdit}
                onDelete={handleDelete}
              />
            </div>
          )}

          {activeTab === 'asistencias' && (
            <div className="space-y-5">
              {/* Filtros en card contenedora */}
              <div className="rounded-lg border border-gray-100 bg-white px-5 py-4 shadow-sm">
                <div className="flex flex-col sm:flex-row items-end gap-3">
                  {/* Desde */}
                  <div className="w-[160px] shrink-0">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Desde</label>
                    <CustomDatePicker
                      type="date"
                      value={fechaDesde}
                      onChange={(e) => setFechaDesde(e.target.value)}
                      className="w-full"
                      inputClassName="h-[34px] text-[13px] font-medium text-gray-700"
                    />
                  </div>

                  {/* Hasta */}
                  <div className="w-[160px] shrink-0">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Hasta</label>
                    <CustomDatePicker
                      type="date"
                      value={fechaHasta}
                      onChange={(e) => setFechaHasta(e.target.value)}
                      className="w-full"
                      inputClassName="h-[34px] text-[13px] font-medium text-gray-700"
                    />
                  </div>

                  {/* Origen */}
                  <div className="w-[150px] shrink-0">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Origen</label>
                    <CustomSelect
                      options={['Todos', 'Captura app', 'Registro manual']}
                      value={selectedOrigin}
                      onChange={setSelectedOrigin}
                      className="rounded-md border-gray-200 px-3 py-2 text-[13px] bg-white w-full h-[38px]"
                    />
                  </div>

                  {/* Buscar */}
                  <div className="flex-1 min-w-0">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Buscar</label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        value={searchAsistencias}
                        onChange={(e) => setSearchAsistencias(e.target.value)}
                        placeholder="Nombre, DNI o cargo..."
                        className="block w-full rounded-md border border-gray-200 h-[38px] pl-9 pr-3 text-gray-900 placeholder:text-gray-400 focus:border-[#00BFA6] focus:ring-1 focus:ring-[#00BFA6] text-[13px]"
                      />
                    </div>
                  </div>

                  {/* Exportar */}
                  <button onClick={handleExport} className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-4 text-[13px] font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors focus:outline-none focus:ring-2 focus:ring-[#00BFA6] focus:ring-offset-1 h-[38px] shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                    Exportar CSV
                  </button>
                </div>
              </div>

              {/* Registros agrupados por fecha */}
              <div className="space-y-5">
                {groupedAsistencias.map(([fecha, records]) => (
                  <div key={fecha}>
                    <div className="flex items-center gap-3 mb-2.5">
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-gray-900 px-2.5 py-1 text-[11px] font-bold text-white tracking-wide">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="size-3 opacity-60">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                        </svg>
                        {fecha}
                      </span>
                      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                        {records.length} registro{records.length !== 1 ? 's' : ''}
                      </span>
                      <div className="flex-grow border-t border-gray-100" />
                    </div>
                    <div className="space-y-1.5">
                      {records.map((record, i) => (
                        <div key={record.id || i} className="flex items-center justify-between rounded-lg border border-gray-100 bg-white px-5 py-3.5 transition-all hover:border-gray-200 hover:shadow-sm group">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center justify-center w-14 h-8 rounded-md bg-emerald-50">
                              <span className="text-[13px] font-bold text-emerald-700 tabular-nums">{record.hora_entrada || '—'}</span>
                            </div>
                            <div>
                              <h3 className="text-[13px] font-bold text-gray-900 group-hover:text-gray-700 transition-colors">{record.trabajador_nombre}</h3>
                              <p className="text-[11px] text-gray-400 mt-0.5">
                                <span className="font-medium text-gray-500">{record.dni}</span>
                                <span className="mx-1.5">·</span>
                                {record.cargo || 'Sin cargo'}
                              </p>
                            </div>
                          </div>
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            record.photo_path === 'manual-entry'
                              ? 'bg-blue-50 text-blue-600 border border-blue-100'
                              : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                          }`}>
                            <span className={`size-1.5 rounded-full ${record.photo_path === 'manual-entry' ? 'bg-blue-400' : 'bg-emerald-400'}`} />
                            {record.photo_path === 'manual-entry' ? 'Manual' : 'App'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {filteredAsistencias.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16">
                    <div className="rounded-full bg-gray-100 p-4 mb-4">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-8 text-gray-400">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                      </svg>
                    </div>
                    <p className="text-sm font-medium text-gray-500">No hay registros de asistencia</p>
                    <p className="text-xs text-gray-400 mt-1">para el período seleccionado</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'prevencion' && (
            <PrevencionTab />
          )}

          <div className={activeTab === 'personas' ? '' : 'hidden'}>
            <PersonasTab onCountChange={setPersonasCount} />
          </div>

          <div className={activeTab === 'proyectos' ? '' : 'hidden'}>
            <ProyectosTab onCountChange={setProyectosCount} />
          </div>
        </div>
      </div>

      <AsistenciaModal
        isOpen={showModal}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
        initialData={editingAsistencia}
      />

      <style>{`
        .asistencia-scroll-hidden {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .asistencia-scroll-hidden::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
