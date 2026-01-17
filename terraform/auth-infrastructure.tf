# Authentication System Infrastructure
# Terraform configuration for authentication service deployment

terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.20"
    }
  }
}

# VPC Configuration
resource "aws_vpc" "auth_vpc" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name        = "mapable-auth-vpc"
    Environment = var.environment
    Component   = "authentication"
  }
}

# Subnets
resource "aws_subnet" "auth_private" {
  count             = 2
  vpc_id            = aws_vpc.auth_vpc.id
  cidr_block        = "10.0.${count.index + 1}.0/24"
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name = "mapable-auth-private-${count.index + 1}"
  }
}

# EKS Cluster for Authentication Service
resource "aws_eks_cluster" "auth_cluster" {
  name     = "mapable-auth-${var.environment}"
  role_arn = aws_iam_role.eks_cluster.arn
  version  = "1.28"

  vpc_config {
    subnet_ids = aws_subnet.auth_private[*].id
  }

  enabled_cluster_log_types = ["api", "audit", "authenticator", "controllerManager", "scheduler"]

  depends_on = [
    aws_cloudwatch_log_group.eks_cluster,
    aws_iam_role_policy_attachment.eks_cluster_policy,
  ]

  tags = {
    Name        = "mapable-auth-cluster"
    Environment = var.environment
  }
}

# Redis for Rate Limiting and Token Cache
resource "aws_elasticache_cluster" "auth_redis" {
  cluster_id           = "mapable-auth-redis-${var.environment}"
  engine               = "redis"
  node_type            = "cache.t3.medium"
  num_cache_nodes      = 1
  parameter_group_name = "default.redis7"
  port                 = 6379
  subnet_group_name    = aws_elasticache_subnet_group.auth.name
  security_group_ids   = [aws_security_group.redis.id]

  tags = {
    Name        = "mapable-auth-redis"
    Environment = var.environment
  }
}

# RDS for Token Blacklist and Audit Logs
resource "aws_db_instance" "auth_database" {
  identifier     = "mapable-auth-db-${var.environment}"
  engine         = "postgres"
  engine_version  = "15.4"
  instance_class  = "db.t3.medium"
  allocated_storage = 100
  storage_type   = "gp3"

  db_name  = "mapable_auth"
  username = "auth_admin"
  password = var.db_password

  vpc_security_group_ids = [aws_security_group.database.id]
  db_subnet_group_name   = aws_db_subnet_group.auth.name

  backup_retention_period = 7
  backup_window          = "03:00-04:00"
  maintenance_window     = "mon:04:00-mon:05:00"

  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]
  performance_insights_enabled    = true

  tags = {
    Name        = "mapable-auth-database"
    Environment = var.environment
  }
}

# CloudWatch Logs for Authentication Events
resource "aws_cloudwatch_log_group" "auth_logs" {
  name              = "/aws/eks/mapable-auth/${var.environment}"
  retention_in_days = 30

  tags = {
    Name = "mapable-auth-logs"
  }
}

# CloudWatch Alarms for Authentication Metrics
resource "aws_cloudwatch_metric_alarm" "auth_error_rate" {
  alarm_name          = "mapable-auth-high-error-rate"
  comparison_operator  = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "ErrorRate"
  namespace           = "Mapable/Auth"
  period              = "300"
  statistic           = "Average"
  threshold           = "5"
  alarm_description   = "This metric monitors authentication error rate"
  alarm_actions       = [aws_sns_topic.auth_alerts.arn]

  tags = {
    Name = "auth-error-rate-alarm"
  }
}

resource "aws_cloudwatch_metric_alarm" "auth_latency" {
  alarm_name          = "mapable-auth-high-latency"
  comparison_operator  = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "Latency"
  namespace           = "Mapable/Auth"
  period              = "300"
  statistic           = "Average"
  threshold           = "1000"
  alarm_description   = "This metric monitors authentication latency"
  alarm_actions       = [aws_sns_topic.auth_alerts.arn]

  tags = {
    Name = "auth-latency-alarm"
  }
}

# SNS Topic for Alerts
resource "aws_sns_topic" "auth_alerts" {
  name = "mapable-auth-alerts-${var.environment}"

  tags = {
    Name = "auth-alerts"
  }
}

# Variables
variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

variable "db_password" {
  description = "Database password"
  type        = string
  sensitive   = true
}

# Data sources
data "aws_availability_zones" "available" {
  state = "available"
}

# Outputs
output "cluster_endpoint" {
  value = aws_eks_cluster.auth_cluster.endpoint
}

output "redis_endpoint" {
  value = aws_elasticache_cluster.auth_redis.cache_nodes[0].address
}

output "database_endpoint" {
  value = aws_db_instance.auth_database.endpoint
}
