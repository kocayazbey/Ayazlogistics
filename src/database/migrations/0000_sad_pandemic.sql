DO $$ BEGIN
 CREATE TYPE "driver_status" AS ENUM('available', 'busy', 'off_duty', 'suspended');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "fuel_type" AS ENUM('diesel', 'gasoline', 'electric', 'hybrid', 'lpg');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "route_status" AS ENUM('planned', 'in_progress', 'completed', 'cancelled');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "stop_status" AS ENUM('pending', 'in_progress', 'completed', 'skipped');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "vehicle_status" AS ENUM('available', 'in_use', 'maintenance', 'out_of_service');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "vehicle_type" AS ENUM('truck', 'van', 'car', 'motorcycle');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid,
	"user_id" uuid,
	"action" varchar(50) NOT NULL,
	"entity_type" varchar(100) NOT NULL,
	"entity_id" uuid,
	"changes" jsonb,
	"ip_address" varchar(45),
	"user_agent" text,
	"metadata" jsonb,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"resource" varchar(100) NOT NULL,
	"action" varchar(50) NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"permissions" jsonb,
	"is_system" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"assigned_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tenants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"company_name" varchar(255),
	"domain" varchar(255),
	"logo" text,
	"settings" jsonb,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"subscription_tier" varchar(50) DEFAULT 'basic',
	"subscription_expires_at" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tenants_code_unique" UNIQUE("code"),
	CONSTRAINT "tenants_domain_unique" UNIQUE("domain")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"password" text NOT NULL,
	"first_name" varchar(100),
	"last_name" varchar(100),
	"phone" varchar(20),
	"role" varchar(50) DEFAULT 'user' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_login" timestamp,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "billing_contracts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"contract_number" varchar(50) NOT NULL,
	"customer_id" uuid NOT NULL,
	"contract_type" varchar(50),
	"start_date" date NOT NULL,
	"end_date" date,
	"status" varchar(20) DEFAULT 'active',
	"billing_cycle" varchar(20),
	"payment_terms" varchar(50),
	"currency" varchar(10) DEFAULT 'TRY',
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "billing_contracts_contract_number_unique" UNIQUE("contract_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "billing_rates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_id" uuid NOT NULL,
	"rate_type" varchar(50) NOT NULL,
	"rate_name" varchar(255) NOT NULL,
	"unit_of_measure" varchar(50),
	"rate_amount" numeric(12, 2) NOT NULL,
	"minimum_charge" numeric(12, 2),
	"currency" varchar(10) DEFAULT 'TRY',
	"valid_from" date NOT NULL,
	"valid_until" date,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "billing_invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"invoice_number" varchar(50) NOT NULL,
	"contract_id" uuid,
	"customer_id" uuid NOT NULL,
	"invoice_date" date NOT NULL,
	"due_date" date NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"subtotal" numeric(15, 2) NOT NULL,
	"tax_amount" numeric(15, 2) DEFAULT '0',
	"total_amount" numeric(15, 2) NOT NULL,
	"paid_amount" numeric(15, 2) DEFAULT '0',
	"currency" varchar(10) DEFAULT 'TRY',
	"status" varchar(20) DEFAULT 'draft',
	"sent_at" timestamp,
	"paid_at" timestamp,
	"metadata" jsonb,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "billing_invoices_invoice_number_unique" UNIQUE("invoice_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "billing_usage_tracking" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"contract_id" uuid NOT NULL,
	"usage_type" varchar(50) NOT NULL,
	"resource_id" uuid,
	"quantity" numeric(12, 2) NOT NULL,
	"unit_of_measure" varchar(50),
	"rate_amount" numeric(12, 2),
	"total_amount" numeric(12, 2),
	"usage_date" date NOT NULL,
	"usage_start_time" timestamp,
	"usage_end_time" timestamp,
	"invoiced" boolean DEFAULT false,
	"invoice_id" uuid,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "exchange_rates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"from_currency" varchar(10) NOT NULL,
	"to_currency" varchar(10) NOT NULL,
	"rate" numeric(20, 10) NOT NULL,
	"source" varchar(50) NOT NULL,
	"effective_date" date NOT NULL,
	"metadata" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "document_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"template_name" varchar(255) NOT NULL,
	"template_type" varchar(50) NOT NULL,
	"template_content" text,
	"template_url" text,
	"variables" jsonb,
	"version" integer DEFAULT 1,
	"is_active" boolean DEFAULT true,
	"metadata" jsonb,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "document_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"file_url" text NOT NULL,
	"changes" text,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"document_number" varchar(50) NOT NULL,
	"document_type" varchar(50) NOT NULL,
	"document_name" varchar(255) NOT NULL,
	"related_to" varchar(50),
	"related_id" uuid,
	"template_id" uuid,
	"file_url" text,
	"file_type" varchar(20),
	"file_size" integer,
	"version" integer DEFAULT 1,
	"status" varchar(20) DEFAULT 'draft',
	"signature_required" boolean DEFAULT false,
	"signed_at" timestamp,
	"signed_by" uuid,
	"signature" text,
	"metadata" jsonb,
	"uploaded_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "documents_document_number_unique" UNIQUE("document_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hukuk_approvals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_id" uuid NOT NULL,
	"approval_stage" varchar(50) NOT NULL,
	"approver_role" varchar(50),
	"approver_id" uuid,
	"decision" varchar(20),
	"comments" text,
	"approved_at" timestamp,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hukuk_contracts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"contract_number" varchar(50) NOT NULL,
	"contract_type" varchar(50),
	"customer_id" uuid NOT NULL,
	"customer_name" varchar(255),
	"start_date" date NOT NULL,
	"end_date" date,
	"status" varchar(20) DEFAULT 'draft',
	"document_url" text,
	"signed_document_url" text,
	"terms" jsonb,
	"clauses" jsonb,
	"approval_status" varchar(20) DEFAULT 'pending',
	"legal_approved_by" uuid,
	"legal_approved_at" timestamp,
	"admin_approved_by" uuid,
	"admin_approved_at" timestamp,
	"customer_signed_at" timestamp,
	"customer_signature" text,
	"rejection_reason" text,
	"metadata" jsonb,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hukuk_contracts_contract_number_unique" UNIQUE("contract_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hukuk_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"contract_id" uuid,
	"document_type" varchar(50),
	"document_number" varchar(50) NOT NULL,
	"version" integer DEFAULT 1,
	"document_url" text,
	"uploaded_by" uuid,
	"verified_by" uuid,
	"verified_at" timestamp,
	"is_verified" boolean DEFAULT false,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "seasonal_pricing_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"rule_name" varchar(255) NOT NULL,
	"season_type" varchar(50) NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"applicable_service_types" jsonb,
	"adjustment_type" varchar(20) NOT NULL,
	"adjustment_value" numeric(10, 2) NOT NULL,
	"minimum_charge" numeric(12, 2),
	"maximum_charge" numeric(12, 2),
	"priority" varchar(10) DEFAULT 'medium',
	"is_active" boolean DEFAULT true,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "carrier_rates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"carrier_id" uuid NOT NULL,
	"customer_id" uuid,
	"mode" varchar(20) NOT NULL,
	"service_type" varchar(30) NOT NULL,
	"origin" varchar(255) NOT NULL,
	"destination" varchar(255) NOT NULL,
	"rate_type" varchar(30) NOT NULL,
	"rate" numeric(12, 2) NOT NULL,
	"currency" varchar(10) DEFAULT 'TRY',
	"valid_from" date NOT NULL,
	"valid_until" date NOT NULL,
	"minimum_charge" numeric(12, 2),
	"free_time" integer,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "customs_declarations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"shipment_id" uuid NOT NULL,
	"declaration_type" varchar(20) NOT NULL,
	"country" varchar(50) NOT NULL,
	"hs_code" varchar(20) NOT NULL,
	"commodity_description" varchar(500),
	"value" numeric(15, 2) NOT NULL,
	"currency" varchar(10) DEFAULT 'USD',
	"quantity" numeric(12, 2) NOT NULL,
	"weight" numeric(12, 2) NOT NULL,
	"duty_amount" numeric(12, 2),
	"tax_amount" numeric(12, 2),
	"status" varchar(30) DEFAULT 'draft',
	"submitted_at" timestamp,
	"cleared_at" timestamp,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "dock_appointments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"appointment_number" varchar(30) NOT NULL,
	"dock_id" uuid NOT NULL,
	"warehouse_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"vehicle_plate" varchar(20),
	"carrier" varchar(100),
	"purpose" varchar(20),
	"scheduled_time" timestamp NOT NULL,
	"estimated_duration" integer,
	"status" varchar(20) DEFAULT 'scheduled',
	"actual_arrival" timestamp,
	"actual_departure" timestamp,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"created_by" uuid,
	CONSTRAINT "dock_appointments_appointment_number_unique" UNIQUE("appointment_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "maintenance_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"type" varchar(30) NOT NULL,
	"scheduled_date" date NOT NULL,
	"completed_date" date,
	"estimated_cost" numeric(10, 2),
	"actual_cost" numeric(10, 2),
	"description" varchar(500),
	"status" varchar(20) DEFAULT 'scheduled',
	"performed_by" varchar(255),
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "multimodal_shipments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"shipment_number" varchar(50) NOT NULL,
	"customer_id" uuid NOT NULL,
	"incoterm" varchar(10),
	"total_legs" integer NOT NULL,
	"current_leg" integer DEFAULT 1,
	"status" varchar(30) DEFAULT 'pending',
	"total_cost" numeric(15, 2),
	"currency" varchar(10) DEFAULT 'TRY',
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "multimodal_shipments_shipment_number_unique" UNIQUE("shipment_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "transport_legs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shipment_id" uuid NOT NULL,
	"leg_number" integer NOT NULL,
	"mode" varchar(20) NOT NULL,
	"service_type" varchar(30),
	"carrier_id" uuid,
	"origin" varchar(255) NOT NULL,
	"destination" varchar(255) NOT NULL,
	"estimated_duration" integer,
	"actual_duration" integer,
	"cost" numeric(12, 2),
	"status" varchar(20) DEFAULT 'pending',
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tms_drivers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"driver_number" varchar(50) NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"phone" varchar(20) NOT NULL,
	"email" varchar(255),
	"license_number" varchar(50) NOT NULL,
	"license_expiry" date NOT NULL,
	"status" "driver_status" DEFAULT 'available' NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tms_drivers_driver_number_unique" UNIQUE("driver_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tms_gps_tracking" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"latitude" numeric(10, 7) NOT NULL,
	"longitude" numeric(10, 7) NOT NULL,
	"speed" numeric(6, 2),
	"heading" numeric(5, 2),
	"accuracy" numeric(6, 2),
	"timestamp" timestamp NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tms_route_stops" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"route_id" uuid NOT NULL,
	"stop_sequence" integer NOT NULL,
	"stop_type" varchar(20) NOT NULL,
	"customer_name" varchar(255) NOT NULL,
	"address" text NOT NULL,
	"latitude" numeric(10, 7) NOT NULL,
	"longitude" numeric(10, 7) NOT NULL,
	"estimated_arrival" timestamp,
	"actual_arrival" timestamp,
	"status" "stop_status" DEFAULT 'pending' NOT NULL,
	"pod_signature" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tms_routes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"route_number" varchar(50) NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"driver_id" uuid NOT NULL,
	"route_date" date NOT NULL,
	"status" "route_status" DEFAULT 'planned' NOT NULL,
	"total_distance" numeric(12, 2),
	"estimated_duration" integer,
	"total_stops" integer,
	"optimization_algorithm" varchar(50),
	"metadata" jsonb,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tms_routes_route_number_unique" UNIQUE("route_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tms_vehicles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"vehicle_number" varchar(50) NOT NULL,
	"license_plate" varchar(50) NOT NULL,
	"vehicle_type" "vehicle_type" NOT NULL,
	"make" varchar(100) NOT NULL,
	"model" varchar(100) NOT NULL,
	"year" integer NOT NULL,
	"capacity" numeric(12, 2) NOT NULL,
	"max_weight" numeric(12, 2) NOT NULL,
	"fuel_type" "fuel_type" NOT NULL,
	"current_odometer" numeric(12, 2) DEFAULT '0',
	"gps_device" varchar(100),
	"status" "vehicle_status" DEFAULT 'available' NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tms_vehicles_vehicle_number_unique" UNIQUE("vehicle_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tracking_geofences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"geofence_type" varchar(50),
	"center_lat" numeric(10, 7),
	"center_lng" numeric(10, 7),
	"radius" numeric(10, 2),
	"polygon" jsonb,
	"alert_on_entry" boolean DEFAULT true,
	"alert_on_exit" boolean DEFAULT true,
	"is_active" boolean DEFAULT true,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tracking_shipment_tracking" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"shipment_id" uuid NOT NULL,
	"status" varchar(50) NOT NULL,
	"location" varchar(255),
	"latitude" numeric(10, 7),
	"longitude" numeric(10, 7),
	"description" text,
	"timestamp" timestamp NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tracking_sla_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"metric_type" varchar(50) NOT NULL,
	"target_value" numeric(10, 2) NOT NULL,
	"actual_value" numeric(10, 2),
	"achievement_rate" numeric(5, 2),
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"status" varchar(20),
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tracking_vehicle_tracking" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"latitude" numeric(10, 7) NOT NULL,
	"longitude" numeric(10, 7) NOT NULL,
	"speed" numeric(6, 2),
	"heading" numeric(5, 2),
	"altitude" numeric(8, 2),
	"accuracy" numeric(6, 2),
	"timestamp" timestamp NOT NULL,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "portal_notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"notification_type" varchar(50),
	"priority" varchar(20) DEFAULT 'normal',
	"is_read" boolean DEFAULT false,
	"read_at" timestamp,
	"action_url" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "portal_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"email" varchar(255) NOT NULL,
	"password" text NOT NULL,
	"first_name" varchar(100),
	"last_name" varchar(100),
	"phone" varchar(20),
	"role" varchar(50) DEFAULT 'customer_user',
	"permissions" jsonb,
	"last_login" timestamp,
	"is_active" boolean DEFAULT true,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "portal_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "portal_stock_card_uploads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"upload_number" varchar(50) NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"file_url" text,
	"file_type" varchar(20),
	"total_records" integer,
	"processed_records" integer DEFAULT 0,
	"success_count" integer DEFAULT 0,
	"error_count" integer DEFAULT 0,
	"errors" jsonb,
	"status" varchar(20) DEFAULT 'pending',
	"uploaded_by" uuid,
	"processed_at" timestamp,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "portal_stock_card_uploads_upload_number_unique" UNIQUE("upload_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "analytics_alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"type" text NOT NULL,
	"condition" jsonb,
	"status" text DEFAULT 'active',
	"triggered_at" timestamp,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "analytics_dashboards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"type" text NOT NULL,
	"status" text DEFAULT 'active',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "analytics_kpis" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category" text,
	"target" numeric(15, 2),
	"current" numeric(15, 2),
	"unit" text,
	"status" text DEFAULT 'active',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "analytics_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"value" numeric(15, 2),
	"unit" text,
	"category" text,
	"subcategory" text,
	"timestamp" timestamp DEFAULT now(),
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "analytics_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"type" text NOT NULL,
	"category" text,
	"status" text DEFAULT 'active',
	"config" jsonb,
	"schedule" jsonb,
	"last_generated" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "analytics_widgets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"dashboard_id" uuid NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"config" jsonb,
	"position" jsonb,
	"status" text DEFAULT 'active',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "api_key_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"api_key_id" uuid NOT NULL,
	"endpoint" varchar(255) NOT NULL,
	"method" varchar(10) NOT NULL,
	"status_code" integer NOT NULL,
	"response_time" integer,
	"ip_address" varchar(45),
	"user_agent" text,
	"request_size" integer,
	"response_size" integer,
	"date" timestamp DEFAULT now() NOT NULL,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"client_id" varchar(100) NOT NULL,
	"key_hash" varchar(64) NOT NULL,
	"tier" varchar(20) DEFAULT 'basic' NOT NULL,
	"permissions" jsonb,
	"rate_limit_per_minute" integer DEFAULT 100,
	"rate_limit_per_hour" integer DEFAULT 1000,
	"rate_limit_per_day" integer DEFAULT 10000,
	"allowed_ips" text,
	"webhook_url" varchar(500),
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_used" timestamp,
	"revoked_at" timestamp,
	"expires_at" timestamp,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "api_keys_client_id_unique" UNIQUE("client_id"),
	CONSTRAINT "api_keys_key_hash_unique" UNIQUE("key_hash")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "rate_limits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"api_key_id" uuid NOT NULL,
	"window_start" timestamp NOT NULL,
	"window_end" timestamp NOT NULL,
	"request_count" integer DEFAULT 0 NOT NULL,
	"limit_type" varchar(20) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "contract_terms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"contract_id" uuid NOT NULL,
	"term" text NOT NULL,
	"value" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "contracts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"contract_number" text NOT NULL,
	"customer" text,
	"type" text,
	"status" text DEFAULT 'draft',
	"total_value" numeric(15, 2),
	"paid_amount" numeric(15, 2),
	"start_date" timestamp,
	"end_date" timestamp,
	"activated_at" timestamp,
	"renewed_at" timestamp,
	"renewal_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "invoice_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"invoice_id" uuid NOT NULL,
	"item_id" uuid,
	"description" text,
	"quantity" integer,
	"unit_price" numeric(15, 2),
	"total_price" numeric(15, 2),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"invoice_number" text NOT NULL,
	"customer" text,
	"status" text DEFAULT 'draft',
	"total_amount" numeric(15, 2),
	"paid_amount" numeric(15, 2),
	"balance" numeric(15, 2),
	"invoice_date" timestamp,
	"due_date" timestamp,
	"sent_at" timestamp,
	"paid_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"payment_number" text NOT NULL,
	"invoice_id" uuid,
	"customer" text,
	"amount" numeric(15, 2),
	"method" text,
	"status" text DEFAULT 'pending',
	"payment_date" timestamp,
	"processed_at" timestamp,
	"refunded_at" timestamp,
	"refund_amount" numeric(15, 2),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"activity_number" text NOT NULL,
	"type" text NOT NULL,
	"subject" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'pending',
	"priority" text DEFAULT 'medium',
	"assigned_to" uuid,
	"customer_id" uuid,
	"lead_id" uuid,
	"due_date" timestamp,
	"completed_at" timestamp,
	"notes" text,
	"status_updated_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"position" text,
	"department" text,
	"is_primary" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"customer_number" text NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"company" text,
	"address" text,
	"city" text,
	"state" text,
	"country" text,
	"postal_code" text,
	"type" text DEFAULT 'individual',
	"status" text DEFAULT 'active',
	"customer_value" numeric(15, 2),
	"source" text,
	"notes" text,
	"status_updated_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"lead_number" text NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"company" text,
	"source" text,
	"status" text DEFAULT 'new',
	"assigned_to" uuid,
	"priority" text DEFAULT 'medium',
	"value" numeric(15, 2),
	"notes" text,
	"assigned_at" timestamp,
	"converted_at" timestamp,
	"status_updated_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "erp_gl_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"account_code" varchar(50) NOT NULL,
	"account_name" varchar(255) NOT NULL,
	"account_type" varchar(50) NOT NULL,
	"parent_account_id" uuid,
	"balance" numeric(15, 2) DEFAULT '0',
	"currency" varchar(10) DEFAULT 'TRY',
	"description" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "erp_journal_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"entry_number" varchar(50) NOT NULL,
	"entry_date" timestamp NOT NULL,
	"account_id" uuid NOT NULL,
	"debit" numeric(15, 2) DEFAULT '0',
	"credit" numeric(15, 2) DEFAULT '0',
	"description" text,
	"reference" varchar(100),
	"metadata" jsonb,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "erp_journal_entries_entry_number_unique" UNIQUE("entry_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "erp_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"transaction_number" varchar(50) NOT NULL,
	"transaction_date" timestamp NOT NULL,
	"transaction_type" varchar(50) NOT NULL,
	"category" varchar(100),
	"amount" numeric(15, 2) NOT NULL,
	"currency" varchar(10) DEFAULT 'TRY',
	"description" text,
	"reference" varchar(100),
	"status" varchar(20) DEFAULT 'completed',
	"metadata" jsonb,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "erp_transactions_transaction_number_unique" UNIQUE("transaction_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "erp_attendance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"attendance_date" date NOT NULL,
	"check_in" timestamp,
	"check_out" timestamp,
	"total_hours" numeric(5, 2),
	"overtime_hours" numeric(5, 2) DEFAULT '0',
	"status" varchar(20) DEFAULT 'present',
	"notes" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "erp_employees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"employee_number" varchar(50) NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"email" varchar(255),
	"phone" varchar(20),
	"national_id" varchar(50),
	"date_of_birth" date,
	"hire_date" date NOT NULL,
	"termination_date" date,
	"department" varchar(100),
	"position" varchar(100),
	"manager_id" uuid,
	"employment_type" varchar(50),
	"base_salary" numeric(12, 2),
	"currency" varchar(10) DEFAULT 'TRY',
	"bank_account" varchar(50),
	"tax_number" varchar(50),
	"social_security_number" varchar(50),
	"address" text,
	"emergency_contact" jsonb,
	"documents" jsonb,
	"status" varchar(20) DEFAULT 'active',
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "erp_employees_employee_number_unique" UNIQUE("employee_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "erp_leave_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"leave_type" varchar(50) NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"total_days" integer NOT NULL,
	"reason" text,
	"status" varchar(20) DEFAULT 'pending',
	"approved_by" uuid,
	"approved_at" timestamp,
	"rejected_reason" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "erp_payrolls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"payroll_number" varchar(50) NOT NULL,
	"pay_period_start" date NOT NULL,
	"pay_period_end" date NOT NULL,
	"pay_date" date NOT NULL,
	"base_salary" numeric(12, 2) NOT NULL,
	"overtime" numeric(12, 2) DEFAULT '0',
	"bonus" numeric(12, 2) DEFAULT '0',
	"allowances" numeric(12, 2) DEFAULT '0',
	"gross_pay" numeric(12, 2) NOT NULL,
	"income_tax" numeric(12, 2) DEFAULT '0',
	"social_security" numeric(12, 2) DEFAULT '0',
	"other_deductions" numeric(12, 2) DEFAULT '0',
	"total_deductions" numeric(12, 2) NOT NULL,
	"net_pay" numeric(12, 2) NOT NULL,
	"currency" varchar(10) DEFAULT 'TRY',
	"status" varchar(20) DEFAULT 'pending',
	"paid_at" timestamp,
	"metadata" jsonb,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "erp_payrolls_payroll_number_unique" UNIQUE("payroll_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "erp_performance_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"review_period_start" date NOT NULL,
	"review_period_end" date NOT NULL,
	"review_date" date NOT NULL,
	"reviewed_by" uuid,
	"overall_rating" integer,
	"kpi_scores" jsonb,
	"strengths" text,
	"areas_for_improvement" text,
	"goals" jsonb,
	"feedback" text,
	"status" varchar(20) DEFAULT 'draft',
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "erp_batch_lots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"stock_card_id" uuid NOT NULL,
	"lot_number" varchar(100) NOT NULL,
	"batch_number" varchar(100),
	"quantity" integer NOT NULL,
	"manufacture_date" date,
	"expiry_date" date,
	"received_date" date,
	"status" varchar(20) DEFAULT 'available',
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "erp_stock_cards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"sku" varchar(100) NOT NULL,
	"barcode" varchar(100),
	"product_name" varchar(255) NOT NULL,
	"description" text,
	"category" varchar(100),
	"brand" varchar(100),
	"unit_cost" numeric(12, 2),
	"unit_price" numeric(12, 2),
	"currency" varchar(10) DEFAULT 'TRY',
	"quantity_on_hand" integer DEFAULT 0,
	"quantity_available" integer DEFAULT 0,
	"quantity_reserved" integer DEFAULT 0,
	"reorder_point" integer,
	"reorder_quantity" integer,
	"metadata" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "erp_stock_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"stock_card_id" uuid NOT NULL,
	"batch_lot_id" uuid,
	"movement_type" varchar(50) NOT NULL,
	"movement_reason" varchar(100),
	"quantity" integer NOT NULL,
	"unit_cost" numeric(12, 2),
	"total_cost" numeric(12, 2),
	"from_location" varchar(100),
	"to_location" varchar(100),
	"reference" varchar(100),
	"movement_date" timestamp NOT NULL,
	"metadata" jsonb,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "erp_purchase_order_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"purchase_order_id" uuid NOT NULL,
	"stock_card_id" uuid,
	"line_number" integer NOT NULL,
	"description" text NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price" numeric(12, 2) NOT NULL,
	"line_total" numeric(12, 2) NOT NULL,
	"received_quantity" integer DEFAULT 0,
	"line_status" varchar(20) DEFAULT 'pending',
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "erp_purchase_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"po_number" varchar(50) NOT NULL,
	"supplier_id" uuid NOT NULL,
	"order_date" timestamp NOT NULL,
	"expected_delivery_date" timestamp,
	"actual_delivery_date" timestamp,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"subtotal" numeric(15, 2) NOT NULL,
	"tax_amount" numeric(15, 2) DEFAULT '0',
	"shipping_cost" numeric(15, 2) DEFAULT '0',
	"total_amount" numeric(15, 2) NOT NULL,
	"currency" varchar(10) DEFAULT 'TRY',
	"payment_terms" varchar(50),
	"notes" text,
	"approved_by" uuid,
	"approved_at" timestamp,
	"metadata" jsonb,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "erp_purchase_orders_po_number_unique" UNIQUE("po_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "erp_suppliers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"supplier_code" varchar(50) NOT NULL,
	"company_name" varchar(255) NOT NULL,
	"contact_name" varchar(255),
	"email" varchar(255),
	"phone" varchar(20),
	"address" text,
	"tax_number" varchar(50),
	"payment_terms" varchar(50),
	"lead_time_days" integer,
	"rating" integer,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "erp_suppliers_supplier_code_unique" UNIQUE("supplier_code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "employees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"employee_number" text NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"department" text,
	"position" text,
	"manager_id" uuid,
	"salary" numeric(15, 2),
	"status" text DEFAULT 'active',
	"hire_date" timestamp,
	"status_updated_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "finance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"transaction_number" text NOT NULL,
	"type" text NOT NULL,
	"category" text,
	"account" text,
	"amount" numeric(15, 2),
	"description" text,
	"status" text DEFAULT 'pending',
	"date" timestamp,
	"approved_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "inventory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"item_number" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category" text,
	"supplier" text,
	"quantity" integer DEFAULT 0,
	"unit_cost" numeric(15, 2),
	"reorder_level" integer DEFAULT 0,
	"status" text DEFAULT 'active',
	"last_updated" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "purchase_order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"purchase_order_id" uuid NOT NULL,
	"item_id" uuid,
	"quantity" integer,
	"unit_price" numeric(15, 2),
	"total_price" numeric(15, 2),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "purchase_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"order_number" text NOT NULL,
	"supplier" text,
	"status" text DEFAULT 'pending',
	"total_amount" numeric(15, 2),
	"order_date" timestamp,
	"expected_date" timestamp,
	"received_date" timestamp,
	"approved_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "integration_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"integration_id" uuid NOT NULL,
	"operation" varchar(100) NOT NULL,
	"direction" varchar(10),
	"request" jsonb,
	"response" jsonb,
	"status_code" integer,
	"success" boolean,
	"error_message" text,
	"duration" integer,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "integration_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"integration_name" varchar(255) NOT NULL,
	"integration_type" varchar(50) NOT NULL,
	"provider" varchar(100),
	"credentials" jsonb,
	"config" jsonb,
	"webhook_url" text,
	"is_active" boolean DEFAULT true,
	"last_sync_at" timestamp,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"location_code" text NOT NULL,
	"warehouse_id" uuid NOT NULL,
	"zone" text,
	"aisle" text,
	"rack" text,
	"shelf" text,
	"bin" text,
	"location_type" text,
	"is_occupied" boolean DEFAULT false,
	"item_id" uuid,
	"occupied_at" timestamp,
	"released_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "drivers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_number" varchar(20),
	"first_name" varchar(50) NOT NULL,
	"last_name" varchar(50) NOT NULL,
	"phone" varchar(20),
	"email" varchar(100),
	"license_number" varchar(50) NOT NULL,
	"license_expiry" timestamp,
	"license_class" varchar(10),
	"carrier_id" uuid,
	"tenant_id" uuid NOT NULL,
	"status" varchar(20) DEFAULT 'active',
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "gps_tracking" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"driver_id" uuid,
	"latitude" numeric(10, 8),
	"longitude" numeric(11, 8),
	"altitude" numeric(10, 2),
	"speed" numeric(10, 2),
	"heading" numeric(10, 2),
	"accuracy" numeric(10, 2),
	"timestamp" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "load_board" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"load_number" text NOT NULL,
	"origin" text,
	"destination" text,
	"weight" numeric(10, 2),
	"dimensions" jsonb,
	"pickup_date" timestamp,
	"delivery_date" timestamp,
	"rate" numeric(10, 2),
	"carrier_id" uuid,
	"shipper_id" uuid,
	"status" text DEFAULT 'available',
	"matched_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "routes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"route_number" text NOT NULL,
	"vehicle_id" uuid,
	"driver_id" uuid,
	"status" text DEFAULT 'pending',
	"total_distance" numeric(10, 2),
	"estimated_time" integer,
	"actual_time" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "vehicles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"vehicle_number" text NOT NULL,
	"make" text,
	"model" text,
	"year" integer,
	"type" text,
	"capacity" numeric(10, 2),
	"status" text DEFAULT 'available',
	"driver_id" uuid,
	"current_location" jsonb,
	"last_location_update" timestamp,
	"assigned_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "driver_licenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"driver_id" uuid NOT NULL,
	"license_number" text NOT NULL,
	"license_type" text NOT NULL,
	"issued_date" timestamp,
	"expiry_date" timestamp,
	"issuing_authority" text,
	"status" text DEFAULT 'active',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "driver_performance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"driver_id" uuid NOT NULL,
	"period" text NOT NULL,
	"start_date" timestamp,
	"end_date" timestamp,
	"total_deliveries" integer DEFAULT 0,
	"on_time_deliveries" integer DEFAULT 0,
	"average_rating" numeric(3, 2),
	"safety_score" numeric(3, 2),
	"fuel_efficiency" numeric(10, 2),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "vehicle_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"driver_id" uuid NOT NULL,
	"assigned_at" timestamp DEFAULT now(),
	"unassigned_at" timestamp,
	"status" text DEFAULT 'active',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "vehicle_maintenance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"maintenance_type" text NOT NULL,
	"description" text,
	"cost" numeric(15, 2),
	"mileage" integer,
	"scheduled_date" timestamp,
	"completed_date" timestamp,
	"status" text DEFAULT 'scheduled',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "vehicle_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"capacity" numeric(10, 2),
	"dimensions" jsonb,
	"fuel_type" text,
	"status" text DEFAULT 'active',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "barcode_structures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(20) NOT NULL,
	"name" varchar(100) NOT NULL,
	"tenant_id" uuid NOT NULL,
	"barcode_type" varchar(20),
	"pattern" varchar(200),
	"segments" jsonb,
	"validation_rules" jsonb,
	"active" boolean DEFAULT true,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "carriers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(20) NOT NULL,
	"name" varchar(100) NOT NULL,
	"tenant_id" uuid NOT NULL,
	"type" varchar(20),
	"contact_person" varchar(100),
	"contact_email" varchar(100),
	"contact_phone" varchar(20),
	"address" text,
	"scac_code" varchar(4),
	"dot_number" varchar(20),
	"rating" numeric(3, 2),
	"active" boolean DEFAULT true,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cartons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"carton_number" varchar(30) NOT NULL,
	"warehouse_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"order_number" varchar(50),
	"carton_type" varchar(20),
	"status" varchar(20) DEFAULT 'open',
	"items" jsonb,
	"weight" numeric(10, 3),
	"dimensions" jsonb,
	"tracking_number" varchar(50),
	"carrier_code" varchar(20),
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"sealed_at" timestamp,
	"shipped_at" timestamp,
	"created_by" uuid,
	CONSTRAINT "cartons_carton_number_unique" UNIQUE("carton_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "count_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_number" varchar(30) NOT NULL,
	"warehouse_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"count_type" varchar(30) NOT NULL,
	"status" varchar(20) DEFAULT 'planned',
	"planned_date" timestamp,
	"started_at" timestamp,
	"completed_at" timestamp,
	"target_locations" jsonb,
	"target_products" jsonb,
	"assigned_counters" jsonb,
	"results" jsonb,
	"variances" jsonb,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"created_by" uuid,
	CONSTRAINT "count_plans_plan_number_unique" UNIQUE("plan_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "docks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dock_number" varchar(10) NOT NULL,
	"warehouse_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"dock_type" varchar(20),
	"vehicle_types" jsonb,
	"max_vehicle_size" jsonb,
	"features" jsonb,
	"operating_hours" jsonb,
	"status" varchar(20) DEFAULT 'available',
	"current_vehicle" uuid,
	"current_operation" varchar(20),
	"scheduled_vehicles" jsonb,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "forklift_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_number" varchar(30) NOT NULL,
	"warehouse_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"task_type" varchar(20) NOT NULL,
	"forklift_type" varchar(10) NOT NULL,
	"from_location" varchar(50),
	"to_location" varchar(50),
	"pallet_id" uuid,
	"product_info" jsonb,
	"priority" varchar(10) DEFAULT 'normal',
	"status" varchar(20) DEFAULT 'pending',
	"assigned_to" uuid,
	"forklift_id" uuid,
	"estimated_duration" integer,
	"actual_duration" integer,
	"started_at" timestamp,
	"completed_at" timestamp,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"created_by" uuid,
	CONSTRAINT "forklift_tasks_task_number_unique" UNIQUE("task_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "label_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(20) NOT NULL,
	"name" varchar(100) NOT NULL,
	"tenant_id" uuid NOT NULL,
	"label_type" varchar(20),
	"format" varchar(10),
	"template_content" text,
	"width" integer,
	"height" integer,
	"dpi" integer DEFAULT 203,
	"active" boolean DEFAULT true,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "location_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(20) NOT NULL,
	"name" varchar(100) NOT NULL,
	"warehouse_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"location_ids" jsonb NOT NULL,
	"group_type" varchar(20),
	"metadata" jsonb,
	"restrictions" jsonb,
	"created_at" timestamp DEFAULT now(),
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "narrow_aisles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"aisle_code" varchar(20) NOT NULL,
	"warehouse_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"width" numeric(5, 2),
	"max_height" numeric(5, 2),
	"allowed_equipment" jsonb,
	"traffic_control" varchar(20),
	"entry_points" jsonb,
	"exit_points" jsonb,
	"current_status" jsonb,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "picking_carts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cart_number" varchar(20) NOT NULL,
	"warehouse_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"cart_type" varchar(20),
	"capacity" integer,
	"current_load" integer DEFAULT 0,
	"status" varchar(20) DEFAULT 'available',
	"assigned_picker" uuid,
	"current_location" varchar(50),
	"orders" jsonb,
	"items" jsonb,
	"metadata" jsonb,
	"last_update" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "picking_carts_cart_number_unique" UNIQUE("cart_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "picking_routes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(20) NOT NULL,
	"name" varchar(100) NOT NULL,
	"warehouse_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"zone_sequence" jsonb NOT NULL,
	"optimization_type" varchar(20),
	"waypoints" jsonb,
	"total_distance" numeric(10, 2),
	"estimated_duration" integer,
	"active" boolean DEFAULT true,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "production_handovers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"handover_number" varchar(30) NOT NULL,
	"work_order_id" uuid NOT NULL,
	"pallet_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"production_date" timestamp NOT NULL,
	"expiry_date" timestamp,
	"lot_number" varchar(50),
	"batch_number" varchar(50),
	"quality_checked" boolean DEFAULT false,
	"handover_status" varchar(20) DEFAULT 'pending',
	"receiving_location" varchar(50),
	"approved_by" uuid,
	"approved_at" timestamp,
	"rejected_reason" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"created_by" uuid,
	CONSTRAINT "production_handovers_handover_number_unique" UNIQUE("handover_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "putaway_strategies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(20) NOT NULL,
	"name" varchar(100) NOT NULL,
	"warehouse_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"priority" integer DEFAULT 50,
	"rules" jsonb NOT NULL,
	"slotting_rules" jsonb,
	"active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "supervisor_activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"activity_number" varchar(30) NOT NULL,
	"supervisor_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"warehouse_id" uuid NOT NULL,
	"activity_type" varchar(50) NOT NULL,
	"target_entity" varchar(50),
	"target_id" uuid,
	"action" varchar(50),
	"old_value" jsonb,
	"new_value" jsonb,
	"reason" text,
	"requires_approval" boolean DEFAULT false,
	"approved_by" uuid,
	"approved_at" timestamp,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "supervisor_activities_activity_number_unique" UNIQUE("activity_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "work_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"work_order_number" varchar(30) NOT NULL,
	"tenant_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"planned_quantity" integer NOT NULL,
	"produced_quantity" integer DEFAULT 0,
	"status" varchar(20) DEFAULT 'planned',
	"production_line" varchar(50),
	"start_date" timestamp,
	"end_date" timestamp,
	"completed_at" timestamp,
	"pallets" jsonb,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"created_by" uuid,
	CONSTRAINT "work_orders_work_order_number_unique" UNIQUE("work_order_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "workflow_parameters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category" text NOT NULL,
	"type" text NOT NULL,
	"value" text,
	"default_value" text,
	"is_required" boolean DEFAULT false,
	"is_system" boolean DEFAULT false,
	"validation" jsonb,
	"status" text DEFAULT 'active',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "workflow_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category" text NOT NULL,
	"condition" jsonb,
	"action" jsonb,
	"priority" integer DEFAULT 0,
	"status" text DEFAULT 'active',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "yard_vehicles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plate" varchar(20) NOT NULL,
	"warehouse_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"vehicle_type" varchar(20),
	"carrier" varchar(100),
	"driver_name" varchar(100),
	"driver_phone" varchar(20),
	"driver_license" varchar(50),
	"purpose" varchar(20),
	"status" varchar(20) DEFAULT 'waiting',
	"arrival_time" timestamp DEFAULT now(),
	"departure_time" timestamp,
	"appointment_number" varchar(30),
	"assigned_dock" varchar(10),
	"yard_location" varchar(20),
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "zones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(10) NOT NULL,
	"name" varchar(100) NOT NULL,
	"warehouse_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"type" varchar(20) NOT NULL,
	"priority" integer DEFAULT 50,
	"velocity_class" varchar(1),
	"access_type" varchar(20),
	"max_height" numeric(5, 2),
	"aisle_width" numeric(5, 2),
	"picking_strategy" varchar(20),
	"replenishment_type" varchar(20),
	"allowed_equipment" jsonb,
	"restrictions" jsonb,
	"aisles" jsonb,
	"metadata" jsonb,
	"active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "agv_fleet" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"agv_number" text NOT NULL,
	"warehouse_id" uuid NOT NULL,
	"current_task_id" uuid,
	"status" text DEFAULT 'available',
	"assigned_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "batch_lots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"batch_number" text NOT NULL,
	"lot_number" text NOT NULL,
	"item_id" uuid,
	"current_location" text,
	"status" text DEFAULT 'active',
	"expiry_date" timestamp,
	"last_moved_at" timestamp,
	"movement_history" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cartonizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"cartonization_number" text NOT NULL,
	"order_id" uuid,
	"carton_id" uuid,
	"status" text DEFAULT 'pending',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "consolidations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"consolidation_number" text NOT NULL,
	"order_id" uuid,
	"shipment_id" uuid,
	"status" text DEFAULT 'pending',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cross_docks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"cross_dock_number" text NOT NULL,
	"inbound_shipment_id" uuid,
	"outbound_shipment_id" uuid,
	"status" text DEFAULT 'pending',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cycle_counts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"count_number" text NOT NULL,
	"warehouse_id" uuid NOT NULL,
	"location_id" uuid,
	"item_id" uuid,
	"expected_quantity" integer,
	"actual_quantity" integer,
	"variance" integer,
	"status" text DEFAULT 'pending',
	"counted_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "iot_sensors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"sensor_id" text NOT NULL,
	"warehouse_id" uuid,
	"location_id" uuid,
	"type" text NOT NULL,
	"status" text DEFAULT 'active',
	"last_reading" jsonb,
	"last_reading_at" timestamp,
	"reading_history" jsonb,
	"alerts" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "kittings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"kitting_number" text NOT NULL,
	"order_id" uuid,
	"status" text DEFAULT 'pending',
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "labels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"label_number" text NOT NULL,
	"type" text NOT NULL,
	"item_id" uuid,
	"order_id" uuid,
	"status" text DEFAULT 'pending',
	"printed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "packing_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"packing_number" text NOT NULL,
	"warehouse_id" uuid NOT NULL,
	"order_id" uuid,
	"packer_id" uuid,
	"status" text DEFAULT 'pending',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pallets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"pallet_number" text NOT NULL,
	"warehouse_id" uuid NOT NULL,
	"location_id" uuid,
	"order_id" uuid,
	"status" text DEFAULT 'available',
	"assigned_at" timestamp,
	"released_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "picking_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"picking_number" text NOT NULL,
	"warehouse_id" uuid NOT NULL,
	"order_id" uuid,
	"picker_id" uuid,
	"status" text DEFAULT 'pending',
	"priority" text DEFAULT 'normal',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "quality_controls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"control_number" text NOT NULL,
	"item_id" uuid,
	"inspector_id" uuid,
	"type" text NOT NULL,
	"status" text DEFAULT 'pending',
	"passed" boolean,
	"results" jsonb,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "receiving_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"receiving_number" text NOT NULL,
	"warehouse_id" uuid NOT NULL,
	"supplier" text,
	"expected_date" timestamp,
	"received_date" timestamp,
	"status" text DEFAULT 'pending',
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "replenishments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"replenishment_number" text NOT NULL,
	"warehouse_id" uuid NOT NULL,
	"item_id" uuid,
	"from_location" text,
	"to_location" text,
	"quantity" integer,
	"status" text DEFAULT 'pending',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "rfid_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"tag_id" text NOT NULL,
	"item_id" uuid,
	"location_id" uuid,
	"status" text DEFAULT 'active',
	"last_scanned_at" timestamp,
	"scan_history" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "shipments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"shipment_number" text NOT NULL,
	"warehouse_id" uuid NOT NULL,
	"order_id" uuid,
	"carrier" text,
	"tracking_number" text,
	"status" text DEFAULT 'pending',
	"shipped_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "slotting_analysis" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"analysis_number" text NOT NULL,
	"warehouse_id" uuid NOT NULL,
	"item_id" uuid,
	"current_location" text,
	"recommended_location" text,
	"reason" text,
	"status" text DEFAULT 'pending',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "voice_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"session_id" text NOT NULL,
	"user_id" uuid,
	"warehouse_id" uuid,
	"status" text DEFAULT 'active',
	"started_at" timestamp DEFAULT now(),
	"ended_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "warehouses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"address" text,
	"city" text,
	"state" text,
	"country" text,
	"postal_code" text,
	"phone" text,
	"email" text,
	"manager" text,
	"capacity" integer,
	"status" text DEFAULT 'active',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "waves" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"wave_number" text NOT NULL,
	"warehouse_id" uuid NOT NULL,
	"status" text DEFAULT 'pending',
	"released_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "workflow_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"workflow_id" uuid,
	"workflow_type" text,
	"event" text NOT NULL,
	"data" jsonb,
	"status" text DEFAULT 'pending',
	"executed_at" timestamp,
	"completed_at" timestamp,
	"error" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "workflow_triggers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"event" text NOT NULL,
	"condition" jsonb,
	"action" jsonb,
	"status" text DEFAULT 'active',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_drivers_tenant_id" ON "tms_drivers" ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_drivers_status" ON "tms_drivers" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_drivers_license_number" ON "tms_drivers" ("license_number");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_drivers_phone" ON "tms_drivers" ("phone");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_gps_tracking_tenant_id" ON "tms_gps_tracking" ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_gps_tracking_vehicle_id" ON "tms_gps_tracking" ("vehicle_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_gps_tracking_timestamp" ON "tms_gps_tracking" ("timestamp");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_route_stops_route_id" ON "tms_route_stops" ("route_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_route_stops_sequence" ON "tms_route_stops" ("stop_sequence");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_route_stops_status" ON "tms_route_stops" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_routes_tenant_id" ON "tms_routes" ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_routes_vehicle_id" ON "tms_routes" ("vehicle_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_routes_driver_id" ON "tms_routes" ("driver_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_routes_status" ON "tms_routes" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_routes_route_date" ON "tms_routes" ("route_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_vehicles_tenant_id" ON "tms_vehicles" ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_vehicles_status" ON "tms_vehicles" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_vehicles_vehicle_type" ON "tms_vehicles" ("vehicle_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_vehicles_license_plate" ON "tms_vehicles" ("license_plate");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cartons_status_idx" ON "cartons" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cartons_order_idx" ON "cartons" ("order_number");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "forklift_tasks_status_idx" ON "forklift_tasks" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "forklift_tasks_assigned_idx" ON "forklift_tasks" ("assigned_to");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "supervisor_activities_supervisor_idx" ON "supervisor_activities" ("supervisor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "supervisor_activities_type_idx" ON "supervisor_activities" ("activity_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "zones_code_idx" ON "zones" ("code");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "zones_warehouse_idx" ON "zones" ("warehouse_id");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "roles" ADD CONSTRAINT "roles_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "billing_contracts" ADD CONSTRAINT "billing_contracts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "billing_rates" ADD CONSTRAINT "billing_rates_contract_id_billing_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "billing_contracts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "billing_invoices" ADD CONSTRAINT "billing_invoices_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "billing_invoices" ADD CONSTRAINT "billing_invoices_contract_id_billing_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "billing_contracts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "billing_usage_tracking" ADD CONSTRAINT "billing_usage_tracking_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "billing_usage_tracking" ADD CONSTRAINT "billing_usage_tracking_contract_id_billing_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "billing_contracts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "exchange_rates" ADD CONSTRAINT "exchange_rates_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "document_templates" ADD CONSTRAINT "document_templates_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "documents" ADD CONSTRAINT "documents_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "documents" ADD CONSTRAINT "documents_template_id_document_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "document_templates"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "documents" ADD CONSTRAINT "documents_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hukuk_approvals" ADD CONSTRAINT "hukuk_approvals_contract_id_hukuk_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "hukuk_contracts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hukuk_approvals" ADD CONSTRAINT "hukuk_approvals_approver_id_users_id_fk" FOREIGN KEY ("approver_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hukuk_contracts" ADD CONSTRAINT "hukuk_contracts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hukuk_contracts" ADD CONSTRAINT "hukuk_contracts_legal_approved_by_users_id_fk" FOREIGN KEY ("legal_approved_by") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hukuk_contracts" ADD CONSTRAINT "hukuk_contracts_admin_approved_by_users_id_fk" FOREIGN KEY ("admin_approved_by") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hukuk_documents" ADD CONSTRAINT "hukuk_documents_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hukuk_documents" ADD CONSTRAINT "hukuk_documents_contract_id_hukuk_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "hukuk_contracts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hukuk_documents" ADD CONSTRAINT "hukuk_documents_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hukuk_documents" ADD CONSTRAINT "hukuk_documents_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "seasonal_pricing_rules" ADD CONSTRAINT "seasonal_pricing_rules_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "carrier_rates" ADD CONSTRAINT "carrier_rates_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "customs_declarations" ADD CONSTRAINT "customs_declarations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "maintenance_schedules" ADD CONSTRAINT "maintenance_schedules_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "multimodal_shipments" ADD CONSTRAINT "multimodal_shipments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "transport_legs" ADD CONSTRAINT "transport_legs_shipment_id_multimodal_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "multimodal_shipments"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tms_drivers" ADD CONSTRAINT "tms_drivers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tms_gps_tracking" ADD CONSTRAINT "tms_gps_tracking_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tms_gps_tracking" ADD CONSTRAINT "tms_gps_tracking_vehicle_id_tms_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "tms_vehicles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tms_route_stops" ADD CONSTRAINT "tms_route_stops_route_id_tms_routes_id_fk" FOREIGN KEY ("route_id") REFERENCES "tms_routes"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tms_routes" ADD CONSTRAINT "tms_routes_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tms_routes" ADD CONSTRAINT "tms_routes_vehicle_id_tms_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "tms_vehicles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tms_routes" ADD CONSTRAINT "tms_routes_driver_id_tms_drivers_id_fk" FOREIGN KEY ("driver_id") REFERENCES "tms_drivers"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tms_routes" ADD CONSTRAINT "tms_routes_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tms_vehicles" ADD CONSTRAINT "tms_vehicles_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tracking_geofences" ADD CONSTRAINT "tracking_geofences_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tracking_shipment_tracking" ADD CONSTRAINT "tracking_shipment_tracking_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tracking_sla_metrics" ADD CONSTRAINT "tracking_sla_metrics_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tracking_vehicle_tracking" ADD CONSTRAINT "tracking_vehicle_tracking_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "portal_notifications" ADD CONSTRAINT "portal_notifications_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "portal_notifications" ADD CONSTRAINT "portal_notifications_user_id_portal_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "portal_users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "portal_users" ADD CONSTRAINT "portal_users_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "portal_stock_card_uploads" ADD CONSTRAINT "portal_stock_card_uploads_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "portal_stock_card_uploads" ADD CONSTRAINT "portal_stock_card_uploads_uploaded_by_portal_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "portal_users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "api_key_usage" ADD CONSTRAINT "api_key_usage_api_key_id_api_keys_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "api_keys"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "rate_limits" ADD CONSTRAINT "rate_limits_api_key_id_api_keys_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "api_keys"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "erp_gl_accounts" ADD CONSTRAINT "erp_gl_accounts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "erp_journal_entries" ADD CONSTRAINT "erp_journal_entries_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "erp_journal_entries" ADD CONSTRAINT "erp_journal_entries_account_id_erp_gl_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "erp_gl_accounts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "erp_transactions" ADD CONSTRAINT "erp_transactions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "erp_attendance" ADD CONSTRAINT "erp_attendance_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "erp_attendance" ADD CONSTRAINT "erp_attendance_employee_id_erp_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "erp_employees"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "erp_employees" ADD CONSTRAINT "erp_employees_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "erp_leave_requests" ADD CONSTRAINT "erp_leave_requests_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "erp_leave_requests" ADD CONSTRAINT "erp_leave_requests_employee_id_erp_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "erp_employees"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "erp_payrolls" ADD CONSTRAINT "erp_payrolls_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "erp_payrolls" ADD CONSTRAINT "erp_payrolls_employee_id_erp_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "erp_employees"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "erp_performance_reviews" ADD CONSTRAINT "erp_performance_reviews_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "erp_performance_reviews" ADD CONSTRAINT "erp_performance_reviews_employee_id_erp_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "erp_employees"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "erp_batch_lots" ADD CONSTRAINT "erp_batch_lots_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "erp_batch_lots" ADD CONSTRAINT "erp_batch_lots_stock_card_id_erp_stock_cards_id_fk" FOREIGN KEY ("stock_card_id") REFERENCES "erp_stock_cards"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "erp_stock_cards" ADD CONSTRAINT "erp_stock_cards_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "erp_stock_movements" ADD CONSTRAINT "erp_stock_movements_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "erp_stock_movements" ADD CONSTRAINT "erp_stock_movements_stock_card_id_erp_stock_cards_id_fk" FOREIGN KEY ("stock_card_id") REFERENCES "erp_stock_cards"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "erp_stock_movements" ADD CONSTRAINT "erp_stock_movements_batch_lot_id_erp_batch_lots_id_fk" FOREIGN KEY ("batch_lot_id") REFERENCES "erp_batch_lots"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "erp_purchase_order_lines" ADD CONSTRAINT "erp_purchase_order_lines_purchase_order_id_erp_purchase_orders_id_fk" FOREIGN KEY ("purchase_order_id") REFERENCES "erp_purchase_orders"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "erp_purchase_order_lines" ADD CONSTRAINT "erp_purchase_order_lines_stock_card_id_erp_stock_cards_id_fk" FOREIGN KEY ("stock_card_id") REFERENCES "erp_stock_cards"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "erp_purchase_orders" ADD CONSTRAINT "erp_purchase_orders_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "erp_purchase_orders" ADD CONSTRAINT "erp_purchase_orders_supplier_id_erp_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "erp_suppliers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "erp_suppliers" ADD CONSTRAINT "erp_suppliers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "integration_logs" ADD CONSTRAINT "integration_logs_integration_id_integration_connections_id_fk" FOREIGN KEY ("integration_id") REFERENCES "integration_connections"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "integration_connections" ADD CONSTRAINT "integration_connections_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
