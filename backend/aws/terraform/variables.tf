variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment (dev, staging, prod)"
  type        = string
  default     = "production"
}

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
  default     = "crm"
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "db_name" {
  description = "Database name"
  type        = string
  default     = "crmdb"
}

variable "db_username" {
  description = "Database username"
  type        = string
  default     = "crmadmin"
}

variable "db_password" {
  description = "Database password"
  type        = string
  sensitive   = true
}

variable "ses_domain" {
  description = "SES verified domain for sending emails"
  type        = string
  default     = ""
}

variable "ses_email" {
  description = "SES verified email for sending (development)"
  type        = string
}

variable "app_port" {
  description = "Application port"
  type        = number
  default     = 3000
}
