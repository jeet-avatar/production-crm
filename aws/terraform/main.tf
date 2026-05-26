terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# VPC Configuration
resource "aws_vpc" "crm_vpc" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "crm-vpc"
  }
}

# Public Subnets
resource "aws_subnet" "public_subnet_1" {
  vpc_id                  = aws_vpc.crm_vpc.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = "${var.aws_region}a"
  map_public_ip_on_launch = true

  tags = {
    Name = "crm-public-subnet-1"
  }
}

resource "aws_subnet" "public_subnet_2" {
  vpc_id                  = aws_vpc.crm_vpc.id
  cidr_block              = "10.0.2.0/24"
  availability_zone       = "${var.aws_region}b"
  map_public_ip_on_launch = true

  tags = {
    Name = "crm-public-subnet-2"
  }
}

# Private Subnets (for RDS)
resource "aws_subnet" "private_subnet_1" {
  vpc_id            = aws_vpc.crm_vpc.id
  cidr_block        = "10.0.3.0/24"
  availability_zone = "${var.aws_region}a"

  tags = {
    Name = "crm-private-subnet-1"
  }
}

resource "aws_subnet" "private_subnet_2" {
  vpc_id            = aws_vpc.crm_vpc.id
  cidr_block        = "10.0.4.0/24"
  availability_zone = "${var.aws_region}b"

  tags = {
    Name = "crm-private-subnet-2"
  }
}

# Internet Gateway
resource "aws_internet_gateway" "crm_igw" {
  vpc_id = aws_vpc.crm_vpc.id

  tags = {
    Name = "crm-igw"
  }
}

# Route Table
resource "aws_route_table" "public_rt" {
  vpc_id = aws_vpc.crm_vpc.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.crm_igw.id
  }

  tags = {
    Name = "crm-public-rt"
  }
}

# Route Table Association
resource "aws_route_table_association" "public_1" {
  subnet_id      = aws_subnet.public_subnet_1.id
  route_table_id = aws_route_table.public_rt.id
}

resource "aws_route_table_association" "public_2" {
  subnet_id      = aws_subnet.public_subnet_2.id
  route_table_id = aws_route_table.public_rt.id
}

# Security Group for EC2/ECS
resource "aws_security_group" "app_sg" {
  name        = "crm-app-sg"
  description = "Security group for CRM application"
  vpc_id      = aws_vpc.crm_vpc.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "crm-app-sg"
  }
}

# Security Group for RDS
resource "aws_security_group" "rds_sg" {
  name        = "crm-rds-sg"
  description = "Security group for RDS PostgreSQL"
  vpc_id      = aws_vpc.crm_vpc.id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.app_sg.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "crm-rds-sg"
  }
}

# RDS Subnet Group
resource "aws_db_subnet_group" "rds_subnet_group" {
  name       = "crm-rds-subnet-group"
  subnet_ids = [aws_subnet.private_subnet_1.id, aws_subnet.private_subnet_2.id]

  tags = {
    Name = "crm-rds-subnet-group"
  }
}

# RDS PostgreSQL
resource "aws_db_instance" "crm_db" {
  identifier             = "crm-postgres-db"
  engine                 = "postgres"
  engine_version         = "16.1"
  instance_class         = var.db_instance_class
  allocated_storage      = 20
  storage_type           = "gp3"
  db_name                = var.db_name
  username               = var.db_username
  password               = var.db_password
  db_subnet_group_name   = aws_db_subnet_group.rds_subnet_group.name
  vpc_security_group_ids = [aws_security_group.rds_sg.id]
  skip_final_snapshot    = true
  publicly_accessible    = false
  backup_retention_period = 7
  multi_az               = false

  tags = {
    Name = "crm-postgres-db"
  }
}

# S3 Buckets
resource "aws_s3_bucket" "email_attachments" {
  bucket = "${var.project_name}-email-attachments-${var.environment}"

  tags = {
    Name        = "CRM Email Attachments"
    Environment = var.environment
  }
}

resource "aws_s3_bucket" "campaign_assets" {
  bucket = "${var.project_name}-campaign-assets-${var.environment}"

  tags = {
    Name        = "CRM Campaign Assets"
    Environment = var.environment
  }
}

resource "aws_s3_bucket_versioning" "attachments_versioning" {
  bucket = aws_s3_bucket.email_attachments.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_versioning" "assets_versioning" {
  bucket = aws_s3_bucket.campaign_assets.id
  versioning_configuration {
    status = "Enabled"
  }
}

# S3 Bucket for CloudWatch Logs Export
resource "aws_s3_bucket" "logs_bucket" {
  bucket = "${var.project_name}-logs-${var.environment}"

  tags = {
    Name        = "CRM Logs"
    Environment = var.environment
  }
}

# CloudWatch Log Group
resource "aws_cloudwatch_log_group" "crm_logs" {
  name              = "/aws/crm/${var.environment}"
  retention_in_days = 30

  tags = {
    Environment = var.environment
    Application = "CRM"
  }
}

# SES Domain Identity (requires domain verification)
resource "aws_ses_domain_identity" "crm_domain" {
  count  = var.ses_domain != "" ? 1 : 0
  domain = var.ses_domain
}

# SES Email Identity (for development)
resource "aws_ses_email_identity" "crm_email" {
  email = var.ses_email
}

# SNS Topic for SMS
resource "aws_sns_topic" "crm_sms" {
  name = "crm-sms-notifications"

  tags = {
    Environment = var.environment
  }
}

# IAM Role for EC2/ECS
resource "aws_iam_role" "crm_app_role" {
  name = "crm-app-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = ["ec2.amazonaws.com", "ecs-tasks.amazonaws.com"]
        }
      }
    ]
  })
}

# IAM Policy for SES
resource "aws_iam_role_policy" "ses_policy" {
  name = "crm-ses-policy"
  role = aws_iam_role.crm_app_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ses:SendEmail",
          "ses:SendRawEmail",
          "ses:GetSendQuota",
          "ses:GetSendStatistics"
        ]
        Resource = "*"
      }
    ]
  })
}

# IAM Policy for SNS (SMS)
resource "aws_iam_role_policy" "sns_policy" {
  name = "crm-sns-policy"
  role = aws_iam_role.crm_app_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "sns:Publish",
          "sns:GetSMSAttributes",
          "sns:SetSMSAttributes"
        ]
        Resource = "*"
      }
    ]
  })
}

# IAM Policy for S3
resource "aws_iam_role_policy" "s3_policy" {
  name = "crm-s3-policy"
  role = aws_iam_role.crm_app_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.email_attachments.arn,
          "${aws_s3_bucket.email_attachments.arn}/*",
          aws_s3_bucket.campaign_assets.arn,
          "${aws_s3_bucket.campaign_assets.arn}/*"
        ]
      }
    ]
  })
}

# IAM Policy for CloudWatch
resource "aws_iam_role_policy" "cloudwatch_policy" {
  name = "crm-cloudwatch-policy"
  role = aws_iam_role.crm_app_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogStreams"
        ]
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })
}

# IAM Policy for Bedrock (AI Agents)
resource "aws_iam_role_policy" "bedrock_policy" {
  name = "crm-bedrock-policy"
  role = aws_iam_role.crm_app_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "bedrock:InvokeModel",
          "bedrock:InvokeModelWithResponseStream",
          "bedrock:ListFoundationModels"
        ]
        Resource = "*"
      }
    ]
  })
}

# EC2 Instance Profile
resource "aws_iam_instance_profile" "crm_instance_profile" {
  name = "crm-instance-profile"
  role = aws_iam_role.crm_app_role.name
}

# ECS Cluster
resource "aws_ecs_cluster" "crm_cluster" {
  name = "crm-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = {
    Environment = var.environment
  }
}

# Application Load Balancer
resource "aws_lb" "crm_alb" {
  name               = "crm-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.app_sg.id]
  subnets            = [aws_subnet.public_subnet_1.id, aws_subnet.public_subnet_2.id]

  tags = {
    Environment = var.environment
  }
}

# Target Group
resource "aws_lb_target_group" "crm_tg" {
  name     = "crm-tg"
  port     = 3000
  protocol = "HTTP"
  vpc_id   = aws_vpc.crm_vpc.id

  health_check {
    path                = "/health"
    healthy_threshold   = 2
    unhealthy_threshold = 10
  }
}

# ALB Listener
resource "aws_lb_listener" "crm_listener" {
  load_balancer_arn = aws_lb.crm_alb.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.crm_tg.arn
  }
}

# Lambda Function for AI Agents (example)
resource "aws_iam_role" "lambda_role" {
  name = "crm-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_basic" {
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
  role       = aws_iam_role.lambda_role.name
}

resource "aws_iam_role_policy" "lambda_bedrock" {
  name = "lambda-bedrock-policy"
  role = aws_iam_role.lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "bedrock:InvokeModel",
          "bedrock:InvokeModelWithResponseStream"
        ]
        Resource = "*"
      }
    ]
  })
}

# Outputs
output "rds_endpoint" {
  value = aws_db_instance.crm_db.endpoint
}

output "alb_dns_name" {
  value = aws_lb.crm_alb.dns_name
}

output "s3_attachments_bucket" {
  value = aws_s3_bucket.email_attachments.bucket
}

output "s3_assets_bucket" {
  value = aws_s3_bucket.campaign_assets.bucket
}

output "cloudwatch_log_group" {
  value = aws_cloudwatch_log_group.crm_logs.name
}

output "sns_topic_arn" {
  value = aws_sns_topic.crm_sms.arn
}
