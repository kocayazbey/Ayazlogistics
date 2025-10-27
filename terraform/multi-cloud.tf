terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

provider "azurerm" {
  features {}
}

provider "google" {
  project = var.gcp_project_id
  region  = var.gcp_region
}

variable "aws_region" {
  default = "eu-central-1"
}

variable "gcp_region" {
  default = "europe-west3"
}

variable "azure_location" {
  default = "westeurope"
}

variable "gcp_project_id" {
  type = string
}

resource "aws_s3_bucket" "storage" {
  bucket = "ayazlogistics-storage-aws"

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

resource "azurerm_storage_account" "storage" {
  name                     = "ayazlogisticsazure"
  resource_group_name      = azurerm_resource_group.main.name
  location                 = var.azure_location
  account_tier             = "Standard"
  account_replication_type = "GRS"

  tags = {
    environment = "production"
  }
}

resource "azurerm_resource_group" "main" {
  name     = "ayazlogistics-rg"
  location = var.azure_location
}

resource "google_storage_bucket" "storage" {
  name     = "ayazlogistics-storage-gcp"
  location = var.gcp_region
  
  uniform_bucket_level_access = true

  lifecycle_rule {
    condition {
      age = 90
    }
    action {
      type          = "SetStorageClass"
      storage_class = "NEARLINE"
    }
  }
}

output "aws_s3_bucket" {
  value = aws_s3_bucket.storage.id
}

output "azure_storage_account" {
  value = azurerm_storage_account.storage.name
}

output "gcp_storage_bucket" {
  value = google_storage_bucket.storage.name
}

