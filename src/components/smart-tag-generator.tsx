'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { generateSmartTagsAction } from '@/app/products/actions';
import { Sparkles, Loader2, X, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SmartTagGeneratorProps {
  onTagsGenerated: (tags: string[]) => void;
  initialName?: string;
  initialDescription?: string;
  initialScent?: string;
  initialTags?: string;
}

export function SmartTagGenerator({
  onTagsGenerated,
  initialName = '',
  initialDescription = '',
  initialScent = '',
  initialTags = ''
}: SmartTagGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedTags, setGeneratedTags] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    name: initialName,
    description: initialDescription,
    scent: initialScent,
    currentTags: initialTags
  });
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!formData.name.trim() || !formData.description.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide both product name and description.",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    try {
      const result = await generateSmartTagsAction(formData);
      
      if (result.success && result.tags) {
        setGeneratedTags(result.tags);
        setSelectedTags(result.tags); // Auto-select all generated tags
        toast({
          title: "Tags Generated!",
          description: `Generated ${result.tags.length} smart tags for your product.`
        });
      } else {
        throw new Error(result.error || 'Failed to generate tags');
      }
    } catch (error) {
      console.error('Tag generation error:', error);
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : 'Failed to generate smart tags',
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const applyTags = () => {
    onTagsGenerated(selectedTags);
    toast({
      title: "Tags Applied!",
      description: `Applied ${selectedTags.length} tags to your product.`
    });
  };

  const clearAll = () => {
    setGeneratedTags([]);
    setSelectedTags([]);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          Smart Tag Generator
        </CardTitle>
        <CardDescription>
          AI-powered tag generation that learns from your brand and existing products.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Input Form */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Product Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Lavender Dreams Candle"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="scent">Scent (Optional)</Label>
            <Input
              id="scent"
              value={formData.scent}
              onChange={(e) => setFormData(prev => ({ ...prev, scent: e.target.value }))}
              placeholder="e.g., Lavender & Vanilla"
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="description">Product Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Describe your candle's features, benefits, and unique qualities..."
            className="min-h-20"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="currentTags">Current Tags (Optional)</Label>
          <Input
            id="currentTags"
            value={formData.currentTags}
            onChange={(e) => setFormData(prev => ({ ...prev, currentTags: e.target.value }))}
            placeholder="e.g., handmade, premium, soy-wax"
          />
        </div>

        {/* Generate Button */}
        <Button 
          onClick={handleGenerate} 
          disabled={isGenerating || !formData.name.trim() || !formData.description.trim()}
          className="w-full"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating Smart Tags...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Generate Smart Tags
            </>
          )}
        </Button>

        {/* Generated Tags */}
        {generatedTags.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Generated Tags ({selectedTags.length} selected)</h4>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={clearAll}>
                  <X className="mr-1 h-3 w-3" />
                  Clear
                </Button>
                <Button size="sm" onClick={applyTags}>
                  <Check className="mr-1 h-3 w-3" />
                  Apply Selected
                </Button>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {generatedTags.map((tag) => (
                <Badge
                  key={tag}
                  variant={selectedTags.includes(tag) ? "default" : "outline"}
                  className="cursor-pointer hover:bg-primary/80 transition-colors"
                  onClick={() => toggleTag(tag)}
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
