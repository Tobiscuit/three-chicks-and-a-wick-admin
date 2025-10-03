'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  loadDescriptionHistoryAction, 
  addDescriptionVersionAction, 
  rewriteDescriptionAction 
} from '@/app/products/actions';
import { DescriptionVersion } from '@/services/description-history';

export default function TestHistoryPage() {
  const [productId, setProductId] = useState('test-product-123');
  const [testContent, setTestContent] = useState('This is a test description for testing the history feature.');
  const [userPrompt, setUserPrompt] = useState('Make it more exciting');
  const [results, setResults] = useState<string[]>([]);
  const [versions, setVersions] = useState<DescriptionVersion[]>([]);
  const [loading, setLoading] = useState<string | null>(null);

  const addLog = (message: string) => {
    console.log(`[TEST] ${message}`);
    setResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testLoadHistory = async () => {
    setLoading('Loading history...');
    try {
      addLog(`Loading history for product: ${productId}`);
      const result = await loadDescriptionHistoryAction(productId);
      
      if (result.success && result.versions) {
        setVersions(result.versions);
        addLog(`✅ Loaded ${result.versions.length} versions`);
        result.versions.forEach((version, index) => {
          addLog(`  Version ${index + 1}: ${version.description.substring(0, 50)}...`);
        });
      } else {
        addLog(`❌ Failed to load history: ${result.error}`);
      }
    } catch (error) {
      addLog(`❌ Error loading history: ${error}`);
    } finally {
      setLoading(null);
    }
  };

  const testAddVersion = async () => {
    setLoading('Adding version...');
    try {
      const newVersion: DescriptionVersion = {
        id: Date.now().toString(),
        description: testContent,
        userPrompt: 'Test version',
        reasoning: 'Manual test version',
        changes: ['Added via test'],
        timestamp: new Date()
      };

      addLog(`Adding version: ${newVersion.description.substring(0, 50)}...`);
      const result = await addDescriptionVersionAction(productId, newVersion);
      
      if (result.success) {
        addLog('✅ Version added successfully');
        // Reload history
        await testLoadHistory();
      } else {
        addLog(`❌ Failed to add version: ${result.error}`);
      }
    } catch (error) {
      addLog(`❌ Error adding version: ${error}`);
    } finally {
      setLoading(null);
    }
  };

  const testAIRewrite = async () => {
    setLoading('AI rewriting...');
    try {
      addLog(`Testing AI rewrite with prompt: "${userPrompt}"`);
      const result = await rewriteDescriptionAction({
        originalDescription: testContent,
        userPrompt,
        productContext: {
          name: 'Test Product',
          imageAnalysis: 'Test image analysis',
          brandGuidelines: 'Test brand guidelines'
        }
      });

      if (result.success && result.result) {
        addLog('✅ AI rewrite successful');
        addLog(`Original: ${testContent.substring(0, 50)}...`);
        addLog(`Rewritten: ${result.result.reengineeredDescription.substring(0, 50)}...`);
        
        // Add the rewritten version to history
        const newVersion: DescriptionVersion = {
          id: Date.now().toString(),
          description: result.result.reengineeredDescription,
          userPrompt,
          reasoning: result.result.reasoning,
          changes: result.result.changes,
          timestamp: new Date()
        };

        const addResult = await addDescriptionVersionAction(productId, newVersion);
        if (addResult.success) {
          addLog('✅ AI version added to history');
          await testLoadHistory();
        }
      } else {
        addLog(`❌ AI rewrite failed: ${result.error}`);
      }
    } catch (error) {
      addLog(`❌ Error in AI rewrite: ${error}`);
    } finally {
      setLoading(null);
    }
  };

  const clearResults = () => {
    setResults([]);
    setVersions([]);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>History Feature Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Product ID</label>
            <Input 
              value={productId} 
              onChange={(e) => setProductId(e.target.value)}
              placeholder="Enter product ID"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Test Content</label>
            <Textarea 
              value={testContent} 
              onChange={(e) => setTestContent(e.target.value)}
              placeholder="Enter test description content"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">AI Prompt</label>
            <Input 
              value={userPrompt} 
              onChange={(e) => setUserPrompt(e.target.value)}
              placeholder="Enter AI rewrite prompt"
            />
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={testLoadHistory} 
              disabled={loading !== null}
              variant="outline"
            >
              {loading === 'Loading history...' ? 'Loading...' : 'Load History'}
            </Button>
            
            <Button 
              onClick={testAddVersion} 
              disabled={loading !== null}
              variant="outline"
            >
              {loading === 'Adding version...' ? 'Adding...' : 'Add Version'}
            </Button>
            
            <Button 
              onClick={testAIRewrite} 
              disabled={loading !== null}
              variant="outline"
            >
              {loading === 'AI rewriting...' ? 'Rewriting...' : 'Test AI Rewrite'}
            </Button>
            
            <Button 
              onClick={clearResults} 
              variant="destructive"
            >
              Clear Results
            </Button>
          </div>
        </CardContent>
      </Card>

      {versions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Loaded Versions ({versions.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-60 overflow-y-auto">
              {versions.map((version, index) => (
                <div key={version.id} className="border rounded p-3">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium">Version {versions.length - index}</h4>
                    <span className="text-sm text-muted-foreground">
                      {version.timestamp.toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm mb-2">{version.description.substring(0, 100)}...</p>
                  {version.userPrompt && (
                    <p className="text-xs text-muted-foreground">
                      Prompt: {version.userPrompt}
                    </p>
                  )}
                  {version.reasoning && (
                    <p className="text-xs text-muted-foreground">
                      Reasoning: {version.reasoning}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Test Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1 max-h-60 overflow-y-auto font-mono text-sm">
            {results.length === 0 ? (
              <p className="text-muted-foreground">No test results yet...</p>
            ) : (
              results.map((result, index) => (
                <div key={index} className="p-2 bg-muted/50 rounded">
                  {result}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
