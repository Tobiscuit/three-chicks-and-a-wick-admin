/**
 * Input Sanitizer Lambda
 * First layer of security - deterministic cleaning
 */

exports.handler = async (event) => {
    console.log('Input Sanitizer - Event:', JSON.stringify(event, null, 2));
    
    const { userPrompt } = event;
    
    if (!userPrompt) {
        return {
            statusCode: 400,
            body: {
                error: 'Missing userPrompt in event'
            }
        };
    }
    
    // Deterministic threat patterns
    const threatPatterns = {
        instruction_override: /ignore\s+(all\s+)?(previous\s+)?(instructions?|prompts?|rules?)/gi,
        system_exposure: /system\s+(prompt|message|instructions?)/gi,
        role_manipulation: /(you\s+are\s+now|act\s+as|pretend\s+to\s+be)/gi,
        data_extraction: /(show|tell|give)\s+me\s+(your|the)\s+(database|inventory|data|schema)/gi,
        command_injection: /(admin|root|sudo|execute|run)\s+(command|script)/gi,
        authority_claim: /(i\s+am\s+the\s+)?(admin|administrator|owner|manager)/gi
    };
    
    const detectedPatterns = [];
    const sanitizationApplied = [];
    let sanitizedInput = userPrompt;
    
    // Check and sanitize each pattern
    Object.entries(threatPatterns).forEach(([patternName, regex]) => {
        if (regex.test(userPrompt)) {
            detectedPatterns.push(patternName);
            
            // Apply sanitization
            const before = sanitizedInput;
            sanitizedInput = sanitizedInput.replace(regex, '[FILTERED]');
            
            if (before !== sanitizedInput) {
                sanitizationApplied.push(`filtered_${patternName}`);
            }
        }
    });
    
    // Basic XSS protection (just in case)
    const xssPatterns = [
        /<script[^>]*>.*?<\/script>/gi,
        /<iframe[^>]*>.*?<\/iframe>/gi,
        /javascript:/gi,
        /on\w+\s*=/gi
    ];
    
    xssPatterns.forEach(pattern => {
        if (pattern.test(sanitizedInput)) {
            detectedPatterns.push('xss_attempt');
            sanitizedInput = sanitizedInput.replace(pattern, '[FILTERED]');
            sanitizationApplied.push('xss_filtered');
        }
    });
    
    const threatFlags = detectedPatterns.length > 0 ? ['potential_threat'] : [];
    
    const result = {
        sanitizedInput,
        originalInput: userPrompt,
        detectedPatterns,
        sanitizationApplied,
        threatFlags,
        timestamp: Date.now()
    };
    
    console.log('Input Sanitizer - Result:', JSON.stringify(result, null, 2));
    
    return {
        statusCode: 200,
        body: result
    };
};

