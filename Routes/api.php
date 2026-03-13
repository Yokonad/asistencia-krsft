<?php

use Illuminate\Support\Facades\Route;
use Modulos_ERP\AsistenciaKrsft\Controllers\AsistenciaController;

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/list', [AsistenciaController::class, 'list'])->name('asistencia.list');
    Route::get('/hoy', [AsistenciaController::class, 'hoy'])->name('asistencia.hoy');
    Route::get('/counts', [AsistenciaController::class, 'counts'])->name('asistencia.counts');
    Route::get('/proyectos', [AsistenciaController::class, 'proyectos'])->name('asistencia.proyectos');
    Route::post('/store', [AsistenciaController::class, 'store'])->name('asistencia.store');
    Route::get('/{id}', [AsistenciaController::class, 'show'])->name('asistencia.show');
    Route::put('/{id}', [AsistenciaController::class, 'update'])->name('asistencia.update');
    Route::delete('/{id}', [AsistenciaController::class, 'destroy'])->name('asistencia.destroy');
});
