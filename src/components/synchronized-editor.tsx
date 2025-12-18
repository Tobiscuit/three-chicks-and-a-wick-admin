'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { AIContentDisplay } from '@/components/ai-content-display';
import { isHtmlContent, getAIContentClassName, formatHtmlForEditing } from '@/lib/ai-content-utils';
import { 
  rewriteDescriptionAction, 
  loadDescriptionHistoryAction, 
  saveDescriptionHistoryAction,
  addDescriptionVersionAction 
} from '@/app/products/actions';
import { 
  Sparkles, 
  Loader2, 
  History, 
  ChevronLeft, 
  ChevronRight, 
  RotateCcw,
  Wand2,
  Clock,
  CheckCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface DescriptionVersion {
  id: string;
  description: string;
  userPrompt?: string;
  reasoning?: string;
  changes: string[];
  timestamp: Date;
}

interface SynchronizedEditorProps {
  initialContent: string;
  onContentChange: (content: string) => void;
  productId?: string;
  productName?: string;
  imageAnalysis?: string;
  placeholder?: string;
  pivotReason?: string;
}

export function SynchronizedEditor({ 
  initialContent, 
  onContentChange, 
  productId, 
  productName, 
  imageAnalysis,
  placeholder = "Start typing your product description...",
  pivotReason
}: SynchronizedEditorProps) {
  // Single source of truth for content
  const [content, setContent] = useState(initialContent);
  const [descriptionVersions, setDescriptionVersions] = useState<DescriptionVersion[]>([
    {
      id: 'initial',
      description: initialContent,
      userPrompt: 'Initial content',
      reasoning: 'Initial product description',
      changes: [],
      timestamp: new Date()
    }
  ]);
  const [currentVersionIndex, setCurrentVersionIndex] = useState(0);
  const [isRewriting, setIsRewriting] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [userPrompt, setUserPrompt] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [activeTab, setActiveTabState] = useState<'ai' | 'edit'>('ai'); // AI-first default
  const [isTabSwitching, setIsTabSwitching] = useState(false);
  const { toast } = useToast();
  const isInitialized = useRef(false);

  // Tab switcher with skeleton animation
  const setActiveTab = (tab: 'ai' | 'edit') => {
    if (tab === activeTab) return;
    setIsTabSwitching(true);
    setTimeout(() => {
      setActiveTabState(tab);
      setIsTabSwitching(false);
    }, 150); // Brief skeleton flash for smooth transition
  };

  // === DEBUGGING LOGS ===
  // Reduced logging - only log on significant changes
  if (content && content.length > 100 && content !== initialContent) {
    console.log('[SynchronizedEditor] Content updated:', content.substring(0, 100) + '...');
  }

  // Sync content changes to parent component
  const stableOnContentChange = useCallback(onContentChange, []);
  useEffect(() => {
    stableOnContentChange(content);
  }, [content, stableOnContentChange]);

  // Initialize content on first load only
  useEffect(() => {
    if (!isInitialized.current) {
      isInitialized.current = true;
      console.log('[SynchronizedEditor] Initializing');
      setContent(initialContent);
      // Update the initial version
      setDescriptionVersions(prev => [{
        id: 'initial',
        description: initialContent,
        userPrompt: 'Initial content',
        reasoning: 'Initial product description',
        changes: [],
        timestamp: new Date()
      }, ...prev.slice(1)]);
      setCurrentVersionIndex(0);
    }
  }, []); // Empty dependency array - only run once on mount

  // Handle initialContent changes after mount (e.g., when AI data loads)
  // Only update if editor is empty AND we haven't done any AI rewrites yet
  useEffect(() => {
    if (isInitialized.current && initialContent && !hasUnsavedChanges && descriptionVersions.length <= 1) {
      // Only update if current content is empty or very short (likely placeholder)
      if (!content || content.length < 50) {
        console.log('[SynchronizedEditor] Updating from initialContent (editor was empty, no AI rewrites yet)');
        setContent(initialContent);
        // Update the initial version
        setDescriptionVersions(prev => [{
          id: 'initial',
          description: initialContent,
          userPrompt: 'Initial content',
          reasoning: 'Initial product description',
          changes: [],
          timestamp: new Date()
        }, ...prev.slice(1)]);
        setCurrentVersionIndex(0);
      } else {
        console.log('[SynchronizedEditor] Ignoring initialContent change (editor has content or AI rewrites done)');
      }
    }
  }, [initialContent, hasUnsavedChanges, content, descriptionVersions.length]);

  // Load description history on mount
  useEffect(() => {
    const loadHistory = async () => {
      if (!productId) {
        console.log('[SynchronizedEditor] No productId, skipping history load (new product)');
        return;
      }

      console.log('[SynchronizedEditor] Loading history for productId:', productId);
      setIsLoadingHistory(true);
      try {
        const result = await loadDescriptionHistoryAction(productId);
        console.log('[SynchronizedEditor] History load result:', {
          success: result.success,
          versionsCount: result.versions?.length || 0
        });
        
        if (result.success && result.versions && result.versions.length > 0) {
          const versions = result.versions.map((version: any) => ({
            ...version,
            timestamp: new Date(version.timestamp)
          }));
          console.log('[SynchronizedEditor] Loaded', versions.length, 'versions from history');
          setDescriptionVersions(versions);
        } else {
          console.log('[SynchronizedEditor] No history found, using initial version');
        }
      } catch (error) {
        console.error('[SynchronizedEditor] Failed to load description history:', error);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    loadHistory();
  }, [productId]);

  // Handle content changes from rich text editor
  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    setHasUnsavedChanges(true);
  };

  // Handle AI rewriting
  const handleRewrite = async () => {
    if (!userPrompt.trim()) {
      toast({
        variant: "destructive",
        title: "Prompt Required",
        description: "Please enter a prompt for the AI rewriter."
      });
      return;
    }

    setIsRewriting(true);
    try {
      console.log('[SynchronizedEditor] Starting AI rewrite with prompt:', userPrompt);
      console.log('[SynchronizedEditor] Current content:', content.substring(0, 100) + '...');
      
      const result = await rewriteDescriptionAction({
        originalDescription: content,
        userPrompt,
        productContext: {
          name: productName || 'Product',
          imageAnalysis: imageAnalysis || '',
          brandGuidelines: undefined
        }
      });

      console.log('[SynchronizedEditor] AI rewrite result:', result);
      console.log('[SynchronizedEditor] Result success:', result.success);
      console.log('[SynchronizedEditor] Result data:', result.result);

      if (result.success && result.result) {
        // Extract title and description from AI response
        const { title, description } = extractTitleAndDescription(result.result.reengineeredDescription);
        
        const newVersion: DescriptionVersion = {
          id: Date.now().toString(),
          description: description, // Use only the description part, without title
          userPrompt,
          reasoning: result.result.reasoning,
          changes: result.result.changes,
          timestamp: new Date()
        };

        // Add new version and update content
        console.log('[SynchronizedEditor] Adding new version:', newVersion);
        console.log('[SynchronizedEditor] Setting content to:', description.substring(0, 100) + '...');
        setDescriptionVersions(prev => [newVersion, ...prev]);
        setCurrentVersionIndex(0);
        setContent(description); // Use only the description part
        setUserPrompt('');
        setHasUnsavedChanges(false);

        // Save to history
        if (productId) {
          await addDescriptionVersionAction(productId, newVersion);
        }

        const toastMessage = title 
          ? `✨ Description Enhanced (Title: "${title}")`
          : "✨ Description Enhanced";

        toast({
          title: toastMessage,
          description: "AI has successfully re-engineered your description."
        });
      } else {
        console.error('[SynchronizedEditor] AI rewrite failed:', result.error);
        throw new Error(result.error || 'Failed to rewrite description');
      }
    } catch (error: any) {
      console.error('[SynchronizedEditor] Rewrite failed:', error);
      toast({
        variant: "destructive",
        title: "Rewrite Failed",
        description: error.message || 'Failed to rewrite description. Please try again.'
      });
    } finally {
      setIsRewriting(false);
    }
  };

  const switchVersion = (versionIndex: number) => {
    setCurrentVersionIndex(versionIndex);
    setContent(descriptionVersions[versionIndex].description);
    // Don't close history panel - let user browse versions
    setHasUnsavedChanges(false);
  };

  const resetToOriginal = () => {
    setCurrentVersionIndex(0);
    setContent(descriptionVersions[0].description);
    setShowHistory(false);
    setHasUnsavedChanges(false);
    toast({
      title: "🔄 Reset to Original",
      description: "Restored the original description."
    });
  };

  // Extract title from AI response if it exists
  const extractTitleAndDescription = useCallback((aiResponse: string) => {
    // Check if the response contains an h1 or h2 tag
    const titleMatch = aiResponse.match(/<h[12][^>]*>(.*?)<\/h[12]>\s*/i);
    if (titleMatch) {
      const title = titleMatch[1];
      const description = aiResponse.replace(/<h[12][^>]*>.*?<\/h[12]>\s*/i, '');
      return { title, description };
    }
    return { title: null, description: aiResponse };
  }, []);

  return (
    <Card className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2">
      <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg font-semibold tracking-tight">Description</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              {activeTab === 'ai' 
                ? 'Get AI-powered improvements for your product description.'
                : 'Manually edit and format your product description.'}
            </CardDescription>
          </div>
          
          {/* Tab Toggle */}
          <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
            <Button
              type="button"
              variant={activeTab === 'ai' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('ai')}
              className="h-8 px-3 text-sm"
            >
              <Sparkles className="mr-1.5 h-4 w-4" />
              AI
            </Button>
            <Button
              type="button"
              variant={activeTab === 'edit' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('edit')}
              className="h-8 px-3 text-sm"
            >
              ✏️ Edit
            </Button>
          </div>
          
          {/* History & Reset */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowHistory(!showHistory)}
              className="text-xs sm:text-sm"
            >
              <History className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">History</span>
            </Button>
            {currentVersionIndex > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={resetToOriginal}
                className="text-xs sm:text-sm"
              >
                <RotateCcw className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Reset</span>
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-4 sm:p-6 pt-0 space-y-4">
        {/* AI Creative Logic (when available) */}
        {pivotReason && (
          <div className="p-3 bg-primary/10 dark:bg-primary/15 border border-primary/20 dark:border-primary/30 rounded-md flex gap-3 items-start">
            <Sparkles className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-semibold text-primary mb-1">AI Creative Logic</h4>
              <p className="text-sm text-primary/80 dark:text-primary/90 italic">"{pivotReason}"</p>
            </div>
          </div>
        )}

        {/* Tab Content */}
        {isTabSwitching ? (
          // Skeleton loading animation when switching tabs
          <div className="space-y-3 motion-safe:animate-in motion-safe:fade-in">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : activeTab === 'edit' ? (
          // Manual Editor Tab
          <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-right-2">
            <RichTextEditor
              content={content}
              onChange={handleContentChange}
              placeholder={placeholder}
            />
            {hasUnsavedChanges && (
              <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>You have unsaved changes</span>
              </div>
            )}
          </div>
        ) : (
          // AI Tab (Default)
          <div className="space-y-4 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-left-2">
            {isLoadingHistory ? (
              <div className="flex items-center justify-center py-4">
                <div className="text-center space-y-2">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Loading history...</p>
                </div>
              </div>
            ) : isRewriting ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-5/6" />
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Rewriting description...
                </div>
              </div>
            ) : (
              <>
                {/* Current Content Preview */}
                <div className="p-4 rounded-lg border bg-muted/30">
                  <h4 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Current Description</h4>
                  {isHtmlContent(content) ? (
                    <AIContentDisplay 
                      content={content} 
                      className={getAIContentClassName('details')}
                    />
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">{content || <span className="italic text-muted-foreground">No description yet</span>}</p>
                  )}
                </div>
                
                {/* Changes Made (if any) */}
                {descriptionVersions[currentVersionIndex]?.changes.length > 0 && (
                  <div className="border-t pt-3">
                    <h4 className="text-sm font-medium mb-2">Changes Made:</h4>
                    <div className="flex flex-wrap gap-1">
                      {descriptionVersions[currentVersionIndex].changes.map((change, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {change}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* AI Rewrite Input */}
                <div className="border-t pt-4 space-y-3">
                  <div>
                    <label className="text-sm font-medium">How would you like to improve this description?</label>
                    <textarea
                      value={userPrompt}
                      onChange={(e) => setUserPrompt(e.target.value)}
                      placeholder="e.g., Make it sound more appealing, add details about the scent, focus on benefits..."
                      className="mt-2 w-full px-3 py-2 border border-input bg-background text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent resize-none"
                      rows={3}
                    />
                  </div>
                  <Button
                    onClick={handleRewrite}
                    disabled={isRewriting || !userPrompt.trim()}
                    className="w-full"
                  >
                    {isRewriting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Improving...
                      </>
                    ) : (
                      <>
                        <Wand2 className="mr-2 h-4 w-4" />
                        Improve Description
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Version History (shared between tabs) */}
        {showHistory && (
          <div className="border-t pt-4 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2">
            <h4 className="text-sm font-medium mb-3">Version History</h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {descriptionVersions.map((version, index) => (
                <div
                  key={version.id}
                  onClick={() => switchVersion(index)}
                  className={`p-3 rounded-md border cursor-pointer transition-colors ${
                    index === currentVersionIndex
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {index === currentVersionIndex && (
                        <CheckCircle className="h-4 w-4 text-primary" />
                      )}
                      <span className="text-sm font-medium">
                        Version {descriptionVersions.length - index}
                      </span>
                      {index === 0 && hasUnsavedChanges && (
                        <Badge variant="outline" className="text-xs">
                          Current
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {version.timestamp.toLocaleDateString()}
                    </span>
                  </div>
                  {version.userPrompt && (
                    <p className="text-xs text-muted-foreground mt-1">
                      "{version.userPrompt}"
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
