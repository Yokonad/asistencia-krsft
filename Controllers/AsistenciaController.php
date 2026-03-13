<?php

namespace Modulos_ERP\AsistenciaKrsft\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Support\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;

class AsistenciaController extends Controller
{
    /**
     * Conexión a la BD de asistencia (eje_erp en producción, local en dev).
     */
    private function attendanceDB(string $table = 'attendance_records')
    {
        return DB::connection('attendance')->table($table);
    }

    public function index()
    {
        return Inertia::render('asistenciakrsft/Index');
    }

    public function lookupWorkerByDni(Request $request)
    {
        $validated = $request->validate([
            'dni' => ['required', 'regex:/^\d{8}$/'],
        ]);

        $worker = DB::table('trabajadores')
            ->select([
                'id',
                'dni',
                'nombre_completo',
                'nombres',
                'apellido_paterno',
                'apellido_materno',
                'cargo',
                'estado',
            ])
            ->where('dni', $validated['dni'])
            ->first();

        if (! $worker) {
            return response()->json([
                'success' => false,
                'message' => 'Trabajador no encontrado',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'worker' => $worker,
        ]);
    }

    public function captureExternalAttendance(Request $request)
    {
        $validated = $request->validate([
            'dni' => ['required', 'regex:/^\d{8}$/'],
            'latitude' => ['required', 'numeric', 'between:-90,90'],
            'longitude' => ['required', 'numeric', 'between:-180,180'],
            'accuracy' => ['nullable', 'numeric', 'min:0', 'max:10000'],
            'photo' => ['required', 'file', 'mimetypes:image/jpeg,image/png,image/webp', 'max:4096'],
        ]);

        $worker = DB::table('trabajadores')
            ->select([
                'id',
                'dni',
                'nombre_completo',
                'nombres',
                'apellido_paterno',
                'apellido_materno',
                'cargo',
                'estado',
            ])
            ->where('dni', $validated['dni'])
            ->first();

        if (! $worker) {
            return response()->json([
                'success' => false,
                'message' => 'Trabajador no encontrado',
            ], 404);
        }

        if (($worker->estado ?? null) !== 'Activo') {
            return response()->json([
                'success' => false,
                'message' => 'El trabajador no se encuentra activo',
            ], 422);
        }

        $photo = $request->file('photo');
        $extension = $photo->guessExtension() ?: $photo->extension() ?: 'jpg';
        $extension = $extension === 'jpeg' ? 'jpg' : $extension;
        $filename = 'attendance-' . now()->valueOf() . '-' . random_int(100000000, 999999999) . '.' . $extension;
        $photoPath = $photo->storeAs('uploads', $filename, 'public');
        $capturedAt = now();

        $recordId = $this->attendanceDB()->insertGetId([
            'trabajador_id' => $worker->id,
            'dni' => $worker->dni,
            'worker_name' => $this->resolveWorkerName($worker),
            'latitude' => $validated['latitude'],
            'longitude' => $validated['longitude'],
            'accuracy_meters' => $validated['accuracy'] ?? null,
            'photo_path' => $photoPath,
            'device_type' => $this->resolveDeviceType($request->userAgent()),
            'captured_at' => $capturedAt,
            'created_at' => $capturedAt,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Asistencia registrada correctamente',
            'data' => $this->attendanceDB()->find($recordId),
        ], 201);
    }

    /**
     * Lista registros de attendance_records cruzados con trabajadores (por DNI).
     * Acepta filtros: ?fecha=YYYY-MM-DD, ?search=texto, ?mes=YYYY-MM
     */
    public function list(Request $request)
    {
        $query = $this->attendanceDB('attendance_records as ar')
            ->leftJoin('trabajadores as t', 't.id', '=', 'ar.trabajador_id')
            ->select([
                'ar.id',
                'ar.trabajador_id',
                'ar.dni',
                'ar.worker_name as trabajador_nombre',
                't.cargo',
                't.estado as trabajador_estado',
                'ar.latitude',
                'ar.longitude',
                'ar.accuracy_meters',
                'ar.photo_path',
                'ar.device_type',
                'ar.captured_at',
                'ar.created_at',
                // Derive fecha and hora from captured_at
                DB::raw("DATE(ar.captured_at) as fecha"),
                DB::raw("TIME_FORMAT(ar.captured_at, '%H:%i') as hora_entrada"),
            ]);

        // Filter by date range
        if ($request->filled('fecha_desde')) {
            $query->whereDate('ar.captured_at', '>=', $request->fecha_desde);
        }

        if ($request->filled('fecha_hasta')) {
            $query->whereDate('ar.captured_at', '<=', $request->fecha_hasta);
        }

        // Filter by specific date (legacy)
        if ($request->filled('fecha')) {
            $query->whereDate('ar.captured_at', $request->fecha);
        }

        // Filter by month (YYYY-MM) (legacy)
        if ($request->filled('mes')) {
            $query->where(DB::raw("DATE_FORMAT(ar.captured_at, '%Y-%m')"), $request->mes);
        }

        // Search by name or DNI
        if ($request->filled('search')) {
            $search = '%' . $request->search . '%';
            $query->where(function ($q) use ($search) {
                $q->where('ar.worker_name', 'like', $search)
                  ->orWhere('ar.dni', 'like', $search)
                  ->orWhere('t.cargo', 'like', $search);
            });
        }

        $query->orderBy('ar.captured_at', 'desc');

        $records = $query->get();

        return response()->json([
            'success' => true,
            'data' => $records,
            'total' => $records->count(),
        ]);
    }

    /**
     * Devuelve las asistencias registradas hoy para la vista HOY.
     */
    public function hoy(Request $request)
    {
        $today = now()->toDateString();

        $todayRecords = $this->attendanceDB('attendance_records as ar')
            ->leftJoin('trabajadores as t', 't.id', '=', 'ar.trabajador_id')
            ->whereDate('ar.captured_at', $today)
            ->select([
                'ar.id',
                'ar.trabajador_id',
                'ar.dni',
                'ar.worker_name as trabajador_nombre',
                't.cargo',
                'ar.latitude',
                'ar.longitude',
                'ar.accuracy_meters',
                'ar.photo_path',
                'ar.device_type',
                'ar.captured_at',
                DB::raw("DATE(ar.captured_at) as fecha"),
                DB::raw("TIME_FORMAT(ar.captured_at, '%H:%i') as hora_entrada"),
            ])
            ->orderBy('ar.captured_at', 'desc')
            ->get()
            ->unique('trabajador_id')
            ->values();

        $totalTrabajadores = DB::table('trabajadores')
            ->where('estado', 'Activo')
            ->count();
        $totalPresentes = $todayRecords->count();

        return response()->json([
            'success' => true,
            'data' => $todayRecords,
            'total_registros' => $totalPresentes,
            'total_trabajadores' => $totalTrabajadores,
            'total_presentes' => $totalPresentes,
            'total_ausentes' => max($totalTrabajadores - $totalPresentes, 0),
        ]);
    }

    public function show($id)
    {
        $record = $this->attendanceDB('attendance_records as ar')
            ->leftJoin('trabajadores as t', 't.id', '=', 'ar.trabajador_id')
            ->select([
                'ar.*',
                't.cargo',
                't.estado as trabajador_estado',
                't.nombre_completo',
            ])
            ->where('ar.id', $id)
            ->first();

        if (!$record) {
            return response()->json(['success' => false, 'message' => 'Registro no encontrado'], 404);
        }

        return response()->json(['success' => true, 'data' => $record]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'dni' => ['required', 'regex:/^\d{8}$/'],
            'fecha' => ['nullable', 'date'],
            'hora_entrada' => ['nullable', 'date_format:H:i'],
            'latitude' => 'nullable|numeric',
            'longitude' => 'nullable|numeric',
            'accuracy_meters' => 'nullable|numeric',
        ]);

        // Lookup the worker by DNI
        $trabajador = DB::table('trabajadores')->where('dni', $validated['dni'])->first();

        if (!$trabajador) {
            return response()->json([
                'success' => false,
                'message' => 'Trabajador con DNI ' . $validated['dni'] . ' no encontrado',
            ], 404);
        }

        if (($trabajador->estado ?? null) !== 'Activo') {
            return response()->json([
                'success' => false,
                'message' => 'El trabajador no se encuentra activo',
            ], 422);
        }

        $capturedAt = $this->resolveCapturedAt($validated);

        $id = $this->attendanceDB()->insertGetId([
            'trabajador_id' => $trabajador->id,
            'dni' => $trabajador->dni,
            'worker_name' => $this->resolveWorkerName($trabajador),
            'latitude' => $validated['latitude'] ?? 0,
            'longitude' => $validated['longitude'] ?? 0,
            'accuracy_meters' => $validated['accuracy_meters'] ?? null,
            'photo_path' => 'manual-entry',
            'device_type' => 'desktop',
            'captured_at' => $capturedAt,
            'created_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Asistencia registrada para ' . $trabajador->nombre_completo,
            'data' => $this->attendanceDB()->find($id),
        ]);
    }

    public function update(Request $request, $id)
    {
        $record = $this->attendanceDB()->find($id);
        if (!$record) {
            return response()->json(['success' => false, 'message' => 'Registro no encontrado'], 404);
        }

        $validated = $request->validate([
            'dni' => ['nullable', 'regex:/^\d{8}$/'],
            'fecha' => ['nullable', 'date'],
            'hora_entrada' => ['nullable', 'date_format:H:i'],
            'captured_at' => ['nullable', 'date'],
        ]);

        $data = [];

        if (! empty($validated['dni'])) {
            $trabajador = DB::table('trabajadores')->where('dni', $validated['dni'])->first();

            if (! $trabajador) {
                return response()->json([
                    'success' => false,
                    'message' => 'Trabajador con DNI ' . $validated['dni'] . ' no encontrado',
                ], 404);
            }

            if (($trabajador->estado ?? null) !== 'Activo') {
                return response()->json([
                    'success' => false,
                    'message' => 'El trabajador no se encuentra activo',
                ], 422);
            }

            $data['trabajador_id'] = $trabajador->id;
            $data['dni'] = $trabajador->dni;
            $data['worker_name'] = $this->resolveWorkerName($trabajador);
        }

        if (
            ! empty($validated['captured_at'])
            || ! empty($validated['fecha'])
            || array_key_exists('hora_entrada', $validated)
        ) {
            $data['captured_at'] = $this->resolveCapturedAt($validated, Carbon::parse($record->captured_at));
        }

        if (!empty($data)) {
            $this->attendanceDB()->where('id', $id)->update($data);
        }

        return response()->json([
            'success' => true,
            'message' => 'Registro actualizado exitosamente',
            'data' => $this->attendanceDB()->find($id),
        ]);
    }

    public function destroy($id)
    {
        $record = $this->attendanceDB()->find($id);
        if (!$record) {
            return response()->json(['success' => false, 'message' => 'Registro no encontrado'], 404);
        }

        $this->attendanceDB()->where('id', $id)->delete();

        return response()->json([
            'success' => true,
            'message' => 'Registro eliminado exitosamente',
        ]);
    }

    /**
     * Devuelve proyectos activos con sus trabajadores asignados y estadísticas de asistencia.
     */
    /**
     * Counts rápidos para badges de tabs
     */
    public function counts()
    {
        $personas = DB::table('trabajadores')->where('estado', 'Activo')->count();

        $proyectosActivos = DB::table('projects')->where('status', 'active')->count();
        $preProyectos = DB::table('project_pipeline')
            ->whereNull('project_id')
            ->whereNotIn('etapa', ['cerrado_perdido'])
            ->whereExists(function ($q) {
                $q->select(DB::raw(1))->from('pipeline_team as pt')
                    ->join('trabajadores as t', 't.id', '=', 'pt.trabajador_id')
                    ->whereColumn('pt.pipeline_id', 'project_pipeline.id');
            })
            ->count();

        return response()->json([
            'personas' => $personas,
            'proyectos' => $proyectosActivos + $preProyectos,
        ]);
    }

    public function proyectos(Request $request)
    {
        $today = now()->toDateString();

        // ── 1. Proyectos activos (iniciados desde el pipeline) ──
        $activeProjects = DB::table('projects')
            ->where('status', 'active')
            ->select(['id', 'name', 'abbreviation', 'status', 'created_at'])
            ->orderBy('name')
            ->get();

        $projectIds = $activeProjects->pluck('id');

        // ── 2. Pre-proyectos del pipeline (aún no iniciados, con equipo asignado) ──
        $pipelineProjects = DB::table('project_pipeline as pp')
            ->whereNull('pp.project_id')
            ->whereNotIn('pp.etapa', ['cerrado_perdido'])
            ->whereExists(function ($query) {
                $query->select(DB::raw(1))
                    ->from('pipeline_team as pt')
                    ->join('trabajadores as t', 't.id', '=', 'pt.trabajador_id')
                    ->whereColumn('pt.pipeline_id', 'pp.id');
            })
            ->select(['pp.id as pipeline_id', 'pp.nombre_proyecto as name', 'pp.etapa', 'pp.created_at'])
            ->orderBy('pp.nombre_proyecto')
            ->get();

        // ── 3. Trabajadores de proyectos activos ──
        $directAssignments = DB::table('project_workers as pw')
            ->join('trabajadores as t', 't.id', '=', 'pw.trabajador_id')
            ->whereIn('pw.project_id', $projectIds)
            ->select([
                'pw.project_id',
                't.id as trabajador_id',
                't.dni',
                't.nombre_completo',
                't.cargo',
                't.estado',
            ])
            ->orderBy('t.nombre_completo')
            ->get()
            ->groupBy('project_id');

        $pipelineAssignmentsForProjects = DB::table('project_pipeline as pp')
            ->join('pipeline_team as pt', 'pt.pipeline_id', '=', 'pp.id')
            ->join('trabajadores as t', 't.id', '=', 'pt.trabajador_id')
            ->whereIn('pp.project_id', $projectIds)
            ->select([
                'pp.project_id',
                't.id as trabajador_id',
                't.dni',
                't.nombre_completo',
                't.cargo',
                't.estado',
            ])
            ->orderBy('t.nombre_completo')
            ->get()
            ->groupBy('project_id');

        // Combinar fuentes para proyectos activos
        $projectAssignments = $projectIds->mapWithKeys(function ($projectId) use ($directAssignments, $pipelineAssignmentsForProjects) {
            $direct = $directAssignments->get($projectId, collect());
            $pipeline = $pipelineAssignmentsForProjects->get($projectId, collect());
            $merged = $direct->concat($pipeline)->unique('trabajador_id')->sortBy('nombre_completo')->values();
            return [$projectId => $merged];
        });

        // ── 4. Trabajadores de pre-proyectos del pipeline ──
        $pipelineIds = $pipelineProjects->pluck('pipeline_id');
        $pipelineTeamAssignments = collect();
        if ($pipelineIds->isNotEmpty()) {
            $pipelineTeamAssignments = DB::table('pipeline_team as pt')
                ->join('trabajadores as t', 't.id', '=', 'pt.trabajador_id')
                ->whereIn('pt.pipeline_id', $pipelineIds)
                ->select([
                    'pt.pipeline_id',
                    't.id as trabajador_id',
                    't.dni',
                    't.nombre_completo',
                    't.cargo',
                    't.estado',
                ])
                ->orderBy('t.nombre_completo')
                ->get()
                ->groupBy('pipeline_id');
        }

        // ── 5. Asistencias de hoy ──
        $allWorkerIds = $projectAssignments->flatten()->pluck('trabajador_id')
            ->merge($pipelineTeamAssignments->flatten()->pluck('trabajador_id'))
            ->unique()->values();

        $todayAttendance = collect();
        if ($allWorkerIds->isNotEmpty()) {
            $todayAttendance = $this->attendanceDB()
                ->whereDate('captured_at', $today)
                ->whereIn('trabajador_id', $allWorkerIds)
                ->select(['trabajador_id', DB::raw("TIME_FORMAT(captured_at, '%H:%i') as hora_entrada")])
                ->get()
                ->keyBy('trabajador_id');
        }

        // ── 6. Construir respuesta ──
        $buildWorkerList = function ($workers) use ($todayAttendance) {
            $presentToday = 0;
            $list = $workers->map(function ($w) use ($todayAttendance, &$presentToday) {
                $attendance = $todayAttendance->get($w->trabajador_id);
                $present = $attendance !== null;
                if ($present) $presentToday++;
                return [
                    'trabajador_id' => $w->trabajador_id,
                    'dni' => $w->dni,
                    'nombre_completo' => $w->nombre_completo,
                    'cargo' => $w->cargo,
                    'presente_hoy' => $present,
                    'hora_entrada' => $attendance->hora_entrada ?? null,
                ];
            })->values();
            return [$list, $presentToday];
        };

        // Proyectos activos
        $data = $activeProjects->map(function ($project) use ($projectAssignments, $buildWorkerList) {
            $workers = $projectAssignments->get($project->id, collect());
            [$workerList, $presentToday] = $buildWorkerList($workers);
            return [
                'id' => 'project_' . $project->id,
                'name' => $project->name,
                'abbreviation' => $project->abbreviation ?? null,
                'status' => 'active',
                'etapa' => 'Proyecto Iniciado',
                'total_trabajadores' => $workers->count(),
                'presentes_hoy' => $presentToday,
                'ausentes_hoy' => $workers->count() - $presentToday,
                'trabajadores' => $workerList,
            ];
        });

        // Pre-proyectos del pipeline
        $pipelineData = $pipelineProjects->map(function ($pp) use ($pipelineTeamAssignments, $buildWorkerList) {
            $workers = $pipelineTeamAssignments->get($pp->pipeline_id, collect());
            [$workerList, $presentToday] = $buildWorkerList($workers);
            $etapas = [
                'ingresado' => 'Ingresado',
                'contactado' => 'Contactado',
                'visitado' => 'Visitado',
                'presupuestado' => 'Presupuestado',
                'negociacion' => 'Negociación',
                'cerrado_ganado' => 'Cerrado Ganado',
            ];
            return [
                'id' => 'pipeline_' . $pp->pipeline_id,
                'name' => $pp->name,
                'abbreviation' => null,
                'status' => 'pipeline',
                'etapa' => $etapas[$pp->etapa] ?? ucfirst($pp->etapa),
                'total_trabajadores' => $workers->count(),
                'presentes_hoy' => $presentToday,
                'ausentes_hoy' => $workers->count() - $presentToday,
                'trabajadores' => $workerList,
            ];
        });

        $allData = $data->concat($pipelineData)->values();

        return response()->json([
            'success' => true,
            'data' => $allData,
            'total_proyectos' => $allData->count(),
        ]);
    }

    private function resolveWorkerName(object $worker): string
    {
        if (! empty($worker->nombre_completo)) {
            return $worker->nombre_completo;
        }

        $parts = array_filter([
            $worker->apellido_paterno ?? null,
            $worker->apellido_materno ?? null,
            $worker->nombres ?? null,
        ]);

        return trim(implode(' ', $parts)) ?: (string) ($worker->dni ?? 'SIN NOMBRE');
    }

    private function resolveDeviceType(?string $userAgent): ?string
    {
        if (! $userAgent) {
            return null;
        }

        $normalized = Str::lower($userAgent);

        return preg_match('/android|iphone|ipad|ipod|mobile|windows phone/', $normalized)
            ? 'mobile'
            : 'desktop';
    }

    private function resolveCapturedAt(array $payload, ?Carbon $fallback = null): Carbon
    {
        if (! empty($payload['captured_at'])) {
            return Carbon::parse($payload['captured_at']);
        }

        $date = $payload['fecha'] ?? $fallback?->toDateString() ?? now()->toDateString();
        $time = $payload['hora_entrada'] ?? $fallback?->format('H:i') ?? now()->format('H:i');

        return Carbon::createFromFormat('Y-m-d H:i', $date . ' ' . $time);
    }
}
