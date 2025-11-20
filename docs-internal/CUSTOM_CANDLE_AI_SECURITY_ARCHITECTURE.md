# Custom Candle AI Security Architecture

## Overview
Multi-layered security approach for AI-powered custom candle ordering system with human-in-the-loop validation.

## Security Pipeline

```
Customer Order → Chandler AI → Cybersecurity AI → Human Review → Admin Panel
```

### 1. Chandler AI (Structured Output)
- **Purpose**: Generate structured candle specifications from customer input
- **Security**: Strong prompting with output schema validation
- **Output**: JSON with validated fields (scent, size, color, etc.)

### 2. Cybersecurity AI (OWASP Validation)
- **Purpose**: Validate Chandler AI output for security vulnerabilities
- **Checks**:
  - XSS prevention (script injection)
  - SQL injection patterns
  - Prompt injection attempts
  - Business logic bypass attempts
  - Price manipulation detection
- **Action**: Block suspicious orders, flag for human review

### 3. Human Review (Admin Panel)
- **Purpose**: Final validation before order processing
- **Checks**:
  - Price vs. variant mapping accuracy
  - Suspicious order patterns
  - Business logic validation
- **Actions**: Approve, modify, or cancel orders

## Implementation Architecture

### Admin Panel (Next.js)
- **Settings Toggle**: Enable/disable Custom Candle AI processing
- **Order Review Dashboard**: Human review interface
- **Security Logs**: Audit trail of AI decisions

### Custom Storefront (Amplify/Lambda)
- **Chandler AI**: Lambda function with structured prompting
- **Cybersecurity AI**: Separate Lambda for security validation
- **Order Processing**: Secure order creation with validation

### Data Flow
1. Customer submits custom order
2. Chandler AI processes request (structured output)
3. Cybersecurity AI validates output
4. If clean → Human review queue
5. If suspicious → Blocked with security log
6. Human approves/modifies/cancels
7. Order processed through Shopify

## Security Measures

### Input Validation
- Sanitize all customer inputs
- Validate against known attack patterns
- Rate limiting on AI endpoints

### Output Validation
- Schema validation on AI responses
- Business logic validation
- Price consistency checks

### Human Oversight
- All AI decisions require human approval
- Audit trail of all decisions
- Ability to override AI recommendations

### Monitoring & Logging
- Security event logging
- Suspicious pattern detection
- Performance monitoring

## OWASP Top 10 Protection

1. **Injection**: Input sanitization + AI validation
2. **Broken Authentication**: Firebase Auth + role-based access
3. **Sensitive Data Exposure**: Encrypted data transmission
4. **XML External Entities**: No XML processing
5. **Broken Access Control**: Role-based permissions
6. **Security Misconfiguration**: Secure defaults
7. **Cross-Site Scripting**: CSP headers + AI validation
8. **Insecure Deserialization**: JSON schema validation
9. **Known Vulnerabilities**: Regular dependency updates
10. **Insufficient Logging**: Comprehensive audit trail

## Deployment Considerations

### Lambda Functions (AWS)
- **Chandler AI**: Process customer requests
- **Cybersecurity AI**: Validate outputs
- **Order Processing**: Handle approved orders

### Database Security
- Encrypted data at rest
- Secure API endpoints
- Role-based access control

### Network Security
- VPC isolation
- API Gateway with rate limiting
- WAF protection

## Risk Mitigation

### AI-Specific Risks
- **Prompt Injection**: Input sanitization + cybersecurity AI
- **Hallucination**: Human review + business logic validation
- **Bias**: Diverse training data + human oversight

### Business Risks
- **Price Manipulation**: AI validation + human review
- **Order Fraud**: Pattern detection + manual review
- **Data Privacy**: GDPR compliance + data encryption

## Monitoring & Alerting

### Security Alerts
- Suspicious order patterns
- AI validation failures
- Human review delays

### Performance Monitoring
- AI response times
- Order processing latency
- System availability

## Compliance

### Data Protection
- GDPR compliance for EU customers
- CCPA compliance for California customers
- Data retention policies

### Audit Requirements
- Complete audit trail
- Decision logging
- Security event tracking

## Next Steps

1. **Implement Settings Toggle** ✅ (Completed)
2. **Design Chandler AI Lambda** (Next)
3. **Design Cybersecurity AI Lambda** (Next)
4. **Build Human Review Interface** (Next)
5. **Implement Security Logging** (Next)
6. **Deploy to AWS** (Next)

## Security Testing

### Penetration Testing
- Regular security assessments
- AI-specific attack testing
- Business logic validation

### Red Team Exercises
- Simulate attack scenarios
- Test human review processes
- Validate security controls

This architecture provides multiple layers of security while maintaining the flexibility and efficiency of AI-powered processing.
