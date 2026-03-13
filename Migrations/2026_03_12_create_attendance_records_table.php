<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('attendance_records')) {
            DB::statement("
                CREATE TABLE attendance_records (
                    id               BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
                    trabajador_id    BIGINT           NOT NULL,
                    dni              VARCHAR(20)      NOT NULL,
                    worker_name      VARCHAR(255)     NOT NULL,
                    latitude         DECIMAL(10,7)    NOT NULL,
                    longitude        DECIMAL(10,7)    NOT NULL,
                    accuracy_meters  DECIMAL(10,2)    NULL,
                    photo_path       VARCHAR(255)     NOT NULL,
                    device_type      VARCHAR(10)      NULL DEFAULT NULL,
                    captured_at      DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    created_at       DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (id),
                    INDEX idx_trabajador_id (trabajador_id),
                    INDEX idx_captured_at  (captured_at),
                    INDEX idx_dni          (dni)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            ");
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('attendance_records');
    }
};
