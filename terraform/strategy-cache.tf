# DynamoDB table for AI Strategy Cache
resource "aws_dynamodb_table" "strategy_cache" {
  name           = "threechicksandawick-strategy-cache"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "id"

  attribute {
    name = "id"
    type = "S"
  }

  attribute {
    name = "expires_at"
    type = "N"
  }

  # Global Secondary Index for TTL cleanup
  global_secondary_index {
    name     = "ExpiresAtIndex"
    hash_key = "expires_at"
  }

  # TTL for automatic cleanup of expired cache entries
  ttl {
    attribute_name = "expires_at"
    enabled        = true
  }

  tags = {
    Name        = "Strategy Cache"
    Environment = "production"
    Purpose     = "AI strategy caching with 16-hour TTL"
  }
}

# IAM role for AppSync to access DynamoDB
resource "aws_iam_role" "appsync_strategy_cache_role" {
  name = "appsync-strategy-cache-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "appsync.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name = "AppSync Strategy Cache Role"
  }
}

# IAM policy for DynamoDB access
resource "aws_iam_policy" "appsync_strategy_cache_policy" {
  name        = "appsync-strategy-cache-policy"
  description = "Policy for AppSync to access strategy cache DynamoDB table"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query"
        ]
        Resource = [
          aws_dynamodb_table.strategy_cache.arn,
          "${aws_dynamodb_table.strategy_cache.arn}/index/*"
        ]
      }
    ]
  })
}

# Attach policy to role
resource "aws_iam_role_policy_attachment" "appsync_strategy_cache_policy_attachment" {
  role       = aws_iam_role.appsync_strategy_cache_role.name
  policy_arn = aws_iam_policy.appsync_strategy_cache_policy.arn
}
