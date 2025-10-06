# Custom Candle AI - Step Functions Architecture

## Overview
Enhanced architecture using AWS Step Functions to orchestrate Chandler AI → Cybersecurity AI → Human Review pipeline.

## Architecture Diagram

```
┌─────────────┐
│   Frontend  │
│  (Next.js)  │
└──────┬──────┘
       │ startMagicRequest
       ↓
┌─────────────┐
│   AppSync   │
│  (GraphQL)  │
└──────┬──────┘
       │
       ↓
┌─────────────────────┐
│  Lambda: start      │
│  - Check feature    │
│    flag (enabled?)  │
│  - Write job        │
│    (PROCESSING)     │
│  - Start Step Fn    │
└──────┬──────────────┘
       │
       ↓
┌──────────────────────────────────────────────────────────────┐
│                    Step Functions State Machine               │
├──────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌────────────────────────────────────────────────┐           │
│  │ Step 1: Chandler AI                            │           │
│  │ Lambda: chandlerAI                             │           │
│  │ - Call Gemini with structured prompting        │           │
│  │ - Generate JSON: scent, size, color, price     │           │
│  │ - Validate output schema                       │           │
│  │ Output: { candleSpec, geminiResponse }         │           │
│  └────────────┬───────────────────────────────────┘           │
│               │                                                │
│               ↓                                                │
│  ┌────────────────────────────────────────────────┐           │
│  │ Step 2: Cybersecurity AI                       │           │
│  │ Lambda: cybersecurityAI                        │           │
│  │ - Validate against OWASP Top 10                │           │
│  │ - Check for XSS, injection, prompt injection   │           │
│  │ - Verify price vs. variant mapping             │           │
│  │ - Detect business logic bypass attempts        │           │
│  │ Output: { risk: "CLEAN|SUSPICIOUS|BLOCKED",   │           │
│  │           reasons: [], candleSpec }            │           │
│  └────────────┬───────────────────────────────────┘           │
│               │                                                │
│               ↓                                                │
│  ┌────────────────────────────────────────────────┐           │
│  │ Step 3: Decision Gateway (Choice State)        │           │
│  │                                                 │           │
│  │  ┌─────────┐  ┌────────────┐  ┌───────────┐   │           │
│  │  │  CLEAN  │  │ SUSPICIOUS │  │  BLOCKED  │   │           │
│  │  └────┬────┘  └─────┬──────┘  └─────┬─────┘   │           │
│  │       │             │               │          │           │
│  │       ↓             ↓               ↓          │           │
│  │  ┌─────────┐  ┌────────────┐  ┌───────────┐   │           │
│  │  │Shopify  │  │Human Review│  │  Block &  │   │           │
│  │  │Creation │  │   Queue    │  │   Error   │   │           │
│  │  └────┬────┘  └─────┬──────┘  └─────┬─────┘   │           │
│  └───────┼─────────────┼───────────────┼─────────┘           │
│          │             │               │                      │
│          ↓             ↓               ↓                      │
│  ┌──────────────────────────────────────────────┐            │
│  │ Step 4: Update DynamoDB                      │            │
│  │ Lambda: updateJobStatus                      │            │
│  │ - READY (cartId, variantId)                  │            │
│  │ - PENDING_REVIEW (flagged reasons)           │            │
│  │ - BLOCKED (security violation)               │            │
│  └──────────────────────────────────────────────┘            │
│                                                               │
└───────────────────────────────────────────────────────────────┘
       │
       ↓
┌──────────────────┐
│    DynamoDB      │
│  (Jobs Table)    │
│                  │
│ - jobId          │
│ - status         │
│ - candleSpec     │
│ - risk           │
│ - cartId         │
│ - variantId      │
│ - securityFlags  │
└──────────────────┘
```

## Step Function State Machine (ASL)

```json
{
  "Comment": "Custom Candle AI Pipeline with Security Validation",
  "StartAt": "ChandlerAI",
  "States": {
    "ChandlerAI": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:${region}:${account}:function:chandler-ai",
      "TimeoutSeconds": 30,
      "Retry": [
        {
          "ErrorEquals": ["States.TaskFailed"],
          "IntervalSeconds": 2,
          "MaxAttempts": 2,
          "BackoffRate": 2
        }
      ],
      "Catch": [
        {
          "ErrorEquals": ["States.ALL"],
          "Next": "HandleError",
          "ResultPath": "$.error"
        }
      ],
      "ResultPath": "$.chandlerResult",
      "Next": "CybersecurityAI"
    },
    
    "CybersecurityAI": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:${region}:${account}:function:cybersecurity-ai",
      "TimeoutSeconds": 20,
      "Retry": [
        {
          "ErrorEquals": ["States.TaskFailed"],
          "IntervalSeconds": 2,
          "MaxAttempts": 2,
          "BackoffRate": 2
        }
      ],
      "ResultPath": "$.securityResult",
      "Next": "EvaluateRisk"
    },
    
    "EvaluateRisk": {
      "Type": "Choice",
      "Choices": [
        {
          "Variable": "$.securityResult.risk",
          "StringEquals": "BLOCKED",
          "Next": "BlockOrder"
        },
        {
          "Variable": "$.securityResult.risk",
          "StringEquals": "SUSPICIOUS",
          "Next": "QueueForReview"
        }
      ],
      "Default": "CreateShopifyVariant"
    },
    
    "BlockOrder": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:${region}:${account}:function:update-job-status",
      "Parameters": {
        "jobId.$": "$.jobId",
        "status": "BLOCKED",
        "securityResult.$": "$.securityResult"
      },
      "Next": "NotifySecurityBlock"
    },
    
    "NotifySecurityBlock": {
      "Type": "Task",
      "Resource": "arn:aws:states:::sns:publish",
      "Parameters": {
        "TopicArn": "arn:aws:sns:${region}:${account}:security-alerts",
        "Subject": "Security Alert: Blocked Custom Candle Order",
        "Message.$": "$.securityResult.reasons"
      },
      "End": true
    },
    
    "QueueForReview": {
      "Type": "Parallel",
      "Branches": [
        {
          "StartAt": "UpdateJobPendingReview",
          "States": {
            "UpdateJobPendingReview": {
              "Type": "Task",
              "Resource": "arn:aws:lambda:${region}:${account}:function:update-job-status",
              "Parameters": {
                "jobId.$": "$.jobId",
                "status": "PENDING_REVIEW",
                "candleSpec.$": "$.chandlerResult.candleSpec",
                "securityResult.$": "$.securityResult"
              },
              "End": true
            }
          }
        },
        {
          "StartAt": "NotifyAdmin",
          "States": {
            "NotifyAdmin": {
              "Type": "Task",
              "Resource": "arn:aws:states:::sns:publish",
              "Parameters": {
                "TopicArn": "arn:aws:sns:${region}:${account}:admin-review-queue",
                "Subject": "Custom Candle Order Requires Review",
                "Message.$": "States.JsonToString($.securityResult)"
              },
              "End": true
            }
          }
        }
      ],
      "End": true
    },
    
    "CreateShopifyVariant": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:${region}:${account}:function:create-shopify-variant",
      "Parameters": {
        "jobId.$": "$.jobId",
        "candleSpec.$": "$.chandlerResult.candleSpec"
      },
      "ResultPath": "$.shopifyResult",
      "Next": "UpdateJobReady"
    },
    
    "UpdateJobReady": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:${region}:${account}:function:update-job-status",
      "Parameters": {
        "jobId.$": "$.jobId",
        "status": "READY",
        "cartId.$": "$.shopifyResult.cartId",
        "variantId.$": "$.shopifyResult.variantId",
        "html.$": "$.chandlerResult.html"
      },
      "End": true
    },
    
    "HandleError": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:${region}:${account}:function:update-job-status",
      "Parameters": {
        "jobId.$": "$.jobId",
        "status": "ERROR",
        "error.$": "$.error"
      },
      "End": true
    }
  }
}
```

## Lambda Functions

### 1. Lambda: start (existing - modified)
```javascript
// Check feature flag
const featureFlag = await getFeatureFlag('enableMagicRequest');
if (!featureFlag) {
  return { error: 'MAGIC_REQUEST_DISABLED' };
}

// Create job in DynamoDB (status: PROCESSING)
await dynamoDB.put({
  TableName: PREVIEW_JOBS_TABLE,
  Item: {
    jobId,
    status: 'PROCESSING',
    userPrompt,
    createdAt: Date.now(),
    ttl: Math.floor(Date.now() / 1000) + 86400 // 24hr TTL
  }
});

// Start Step Function
await stepFunctions.startExecution({
  stateMachineArn: CANDLE_AI_STATE_MACHINE_ARN,
  input: JSON.stringify({
    jobId,
    userPrompt,
    userId
  })
});

return { jobId };
```

### 2. Lambda: chandlerAI (new - refactored from previewWorker)
```javascript
export const handler = async (event) => {
  const { jobId, userPrompt } = event;
  
  // Call Gemini with structured prompting
  const geminiResponse = await callGemini({
    prompt: CHANDLER_PROMPT,
    userInput: userPrompt,
    responseFormat: { type: 'json_object' }
  });
  
  // Validate schema
  const candleSpec = validateCandleSchema(geminiResponse);
  
  // Render HTML preview
  const html = renderCandlePreview(candleSpec);
  
  return {
    jobId,
    candleSpec,
    html,
    geminiResponse: geminiResponse.raw
  };
};
```

### 3. Lambda: cybersecurityAI (NEW)
```javascript
export const handler = async (event) => {
  const { jobId, chandlerResult } = event;
  const { candleSpec, geminiResponse } = chandlerResult;
  
  const validationResults = [];
  let risk = 'CLEAN';
  
  // 1. XSS Detection
  if (containsXSS(candleSpec)) {
    validationResults.push({
      type: 'XSS',
      severity: 'HIGH',
      field: detectXSSField(candleSpec)
    });
    risk = 'BLOCKED';
  }
  
  // 2. Injection Pattern Detection
  if (containsSQLInjection(candleSpec) || containsCommandInjection(candleSpec)) {
    validationResults.push({
      type: 'INJECTION',
      severity: 'HIGH',
      details: 'SQL or command injection pattern detected'
    });
    risk = 'BLOCKED';
  }
  
  // 3. Prompt Injection Detection
  if (detectsPromptInjection(geminiResponse)) {
    validationResults.push({
      type: 'PROMPT_INJECTION',
      severity: 'MEDIUM',
      details: 'Possible prompt manipulation detected'
    });
    risk = risk === 'BLOCKED' ? 'BLOCKED' : 'SUSPICIOUS';
  }
  
  // 4. Business Logic Validation
  const priceValidation = validatePriceLogic(candleSpec);
  if (!priceValidation.valid) {
    validationResults.push({
      type: 'PRICE_MANIPULATION',
      severity: 'MEDIUM',
      details: priceValidation.reason
    });
    risk = risk === 'BLOCKED' ? 'BLOCKED' : 'SUSPICIOUS';
  }
  
  // 5. AI Hallucination Detection
  if (detectsHallucination(candleSpec)) {
    validationResults.push({
      type: 'AI_HALLUCINATION',
      severity: 'LOW',
      details: 'Unusual output pattern detected'
    });
    risk = risk === 'CLEAN' && risk !== 'BLOCKED' ? 'SUSPICIOUS' : risk;
  }
  
  return {
    jobId,
    risk, // CLEAN, SUSPICIOUS, or BLOCKED
    reasons: validationResults,
    candleSpec // Pass through for next step
  };
};
```

### 4. Lambda: updateJobStatus (NEW)
```javascript
export const handler = async (event) => {
  const { jobId, status, ...additionalData } = event;
  
  await dynamoDB.update({
    TableName: PREVIEW_JOBS_TABLE,
    Key: { jobId },
    UpdateExpression: 'SET #status = :status, #data = :data, updatedAt = :now',
    ExpressionAttributeNames: {
      '#status': 'status',
      '#data': 'data'
    },
    ExpressionAttributeValues: {
      ':status': status,
      ':data': additionalData,
      ':now': Date.now()
    }
  });
  
  return { success: true };
};
```

## DynamoDB Schema Updates

### Jobs Table (enhanced)
```javascript
{
  jobId: string (PK),
  status: 'PROCESSING' | 'READY' | 'PENDING_REVIEW' | 'BLOCKED' | 'ERROR',
  userPrompt: string,
  candleSpec: {
    scent: string,
    size: string,
    color: string,
    price: number,
    // ... other fields
  },
  risk: 'CLEAN' | 'SUSPICIOUS' | 'BLOCKED',
  securityFlags: Array<{
    type: string,
    severity: string,
    details: string
  }>,
  cartId: string, // if READY
  variantId: string, // if READY
  html: string, // if READY
  reviewedBy: string, // admin userId if manually reviewed
  reviewedAt: number, // timestamp
  createdAt: number,
  updatedAt: number,
  ttl: number // 24hr for normal, 7 days for PENDING_REVIEW
}
```

## SNS Topics

### 1. security-alerts
- Immediate notifications for BLOCKED orders
- Email to security team

### 2. admin-review-queue
- Notifications for SUSPICIOUS orders
- Email/SMS to admin panel users

## Admin Panel Integration

### Human Review Interface
```typescript
// Admin Panel: src/app/custom-candle-reviews/page.tsx
export default function CustomCandleReviewsPage() {
  const [pendingOrders, setPendingOrders] = useState([]);
  
  // Fetch orders with status: PENDING_REVIEW
  useEffect(() => {
    fetchPendingReviews();
  }, []);
  
  const handleApprove = async (jobId) => {
    // Call AppSync mutation to approve
    await approveCustomCandleOrder(jobId);
    // This triggers a Lambda that resumes Step Function or directly creates Shopify variant
  };
  
  const handleReject = async (jobId, reason) => {
    // Update job status to BLOCKED with admin reason
    await rejectCustomCandleOrder(jobId, reason);
  };
}
```

## Terraform Configuration

```hcl
# Step Function State Machine
resource "aws_sfn_state_machine" "candle_ai_pipeline" {
  name     = "candle-ai-pipeline-${var.environment}"
  role_arn = aws_iam_role.step_function_role.arn
  
  definition = templatefile("${path.module}/state_machine.asl.json", {
    chandler_ai_arn       = aws_lambda_function.chandler_ai.arn
    cybersecurity_ai_arn  = aws_lambda_function.cybersecurity_ai.arn
    update_job_status_arn = aws_lambda_function.update_job_status.arn
    shopify_variant_arn   = aws_lambda_function.create_shopify_variant.arn
    security_topic_arn    = aws_sns_topic.security_alerts.arn
    admin_topic_arn       = aws_sns_topic.admin_review_queue.arn
  })
}

# Lambda Functions
resource "aws_lambda_function" "chandler_ai" {
  function_name = "chandler-ai-${var.environment}"
  handler       = "chandlerAI.handler"
  runtime       = "nodejs18.x"
  timeout       = 30
  
  environment {
    variables = {
      GEMINI_API_KEY = var.gemini_api_key
      GEMINI_MODEL   = "gemini-2.5-flash"
    }
  }
}

resource "aws_lambda_function" "cybersecurity_ai" {
  function_name = "cybersecurity-ai-${var.environment}"
  handler       = "cybersecurityAI.handler"
  runtime       = "nodejs18.x"
  timeout       = 20
  
  environment {
    variables = {
      GEMINI_API_KEY = var.gemini_api_key
      PRICE_RULES_TABLE = aws_dynamodb_table.price_rules.name
    }
  }
}

# SNS Topics
resource "aws_sns_topic" "security_alerts" {
  name = "security-alerts-${var.environment}"
}

resource "aws_sns_topic" "admin_review_queue" {
  name = "admin-review-queue-${var.environment}"
}
```

## Cost Estimate (per 1000 requests)

- Step Functions: $0.025/1000 state transitions × 6 states = $0.15
- Lambda invocations: $0.20/1M × 5 = $0.001
- Lambda compute: ~$0.10
- DynamoDB: $0.01
- SNS: $0.01
- **Total: ~$0.27 per 1000 custom candle orders**

## Migration Path

1. **Phase 1** (This commit): Settings toggle in admin panel
2. **Phase 2**: Refactor previewWorker → chandlerAI Lambda
3. **Phase 3**: Create cybersecurityAI Lambda with validation
4. **Phase 4**: Create Step Function state machine
5. **Phase 5**: Update start Lambda to trigger Step Function
6. **Phase 6**: Build human review interface in admin panel
7. **Phase 7**: Deploy to staging, test security scenarios
8. **Phase 8**: Production deployment

## Alternative: SQS-based (simpler but less visibility)

```
start → SQS (chandler) → chandlerWorker → SQS (security) → securityWorker → Decision
```

**Pros**: Simpler, cheaper
**Cons**: No visual workflow, harder to debug, manual state management

## Recommendation

Use **Step Functions** for this use case because:
- Security pipelines need visibility
- Human review requires state inspection
- Conditional logic is complex
- Cost difference is negligible for your volume
- Debugging is crucial for security

Would you like me to start implementing Phase 2 (refactor chandlerAI Lambda)?

