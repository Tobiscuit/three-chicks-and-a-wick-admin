'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import { useEffect, useState } from 'react';
import StarterKit from '@tiptap/starter-kit';
import { Node } from '@tiptap/core';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { 
  Bold, 
  Italic, 
  List, 
  ListOrdered, 
  Undo,
  Redo,
  Eye,
  Edit3,
  Code
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AIContentDisplay } from '@/components/ai-content-display';

// Custom extension to preserve class and style attributes
const PreserveAttributes = Node.create({
  name: 'preserveAttributes',
  
  addGlobalAttributes() {
    return [
      {
        types: ['paragraph', 'heading', 'bulletList', 'orderedList', 'listItem'],
        attributes: {
          class: {
            default: null,
            parseHTML: element => element.getAttribute('class'),
            renderHTML: attributes => {
              if (!attributes.class) return {}
              return { class: attributes.class }
            },
          },
          style: {
            default: null,
            parseHTML: element => element.getAttribute('style'),
            renderHTML: attributes => {
              if (!attributes.style) return {}
              return { style: attributes.style }
            },
          },
        },
      },
    ]
  },
});

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  className?: string;
}

export function RichTextEditor({ 
  content, 
  onChange, 
  placeholder = "Start typing your description...",
  className 
}: RichTextEditorProps) {
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [showHTML, setShowHTML] = useState(false);
  
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
        // Allow more flexible HTML parsing for paragraphs
        paragraph: {
          HTMLAttributes: {
            class: null,
          },
        },
      }),
      PreserveAttributes,
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    parseOptions: {
      preserveWhitespace: 'full', // Don't strip whitespace
    },
    editorProps: {
      attributes: {
        class: 'ai-generated-content product-description focus:outline-none min-h-[120px] p-3',
        placeholder,
      },
    },
  });

  // Update editor content when prop changes (only if not focused or content is significantly different)
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      // Avoid cursor jumping if user is typing, but ensure sync if external change
      if (!editor.isFocused) {
        editor.commands.setContent(content);
      }
    }
  }, [editor, content]);

  if (!editor) {
    return null;
  }

  const handleHtmlChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newHtml = e.target.value;
    editor.commands.setContent(newHtml);
    onChange(newHtml);
  };

  return (
    <div className={cn("border rounded-md", className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between p-2 border-b bg-muted/50">
        <div className="flex items-center gap-1">
          {!showHTML && (
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().toggleBold().run()}
                className={cn(
                  "h-8 w-8 p-0",
                  editor.isActive('bold') && "bg-accent text-accent-foreground"
                )}
                title="Bold"
              >
                <Bold className="h-4 w-4" />
              </Button>
              
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().toggleItalic().run()}
                className={cn(
                  "h-8 w-8 p-0",
                  editor.isActive('italic') && "bg-accent text-accent-foreground"
                )}
                title="Italic"
              >
                <Italic className="h-4 w-4" />
              </Button>

              <div className="w-px h-6 bg-border mx-1" />

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                className={cn(
                  "h-8 w-8 p-0 font-bold text-xs",
                  editor.isActive('heading', { level: 2 }) && "bg-accent text-accent-foreground"
                )}
                title="Heading 2"
              >
                H2
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                className={cn(
                  "h-8 w-8 p-0 font-bold text-xs",
                  editor.isActive('heading', { level: 3 }) && "bg-accent text-accent-foreground"
                )}
                title="Heading 3"
              >
                H3
              </Button>
              
              <div className="w-px h-6 bg-border mx-1" />
              
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                className={cn(
                  "h-8 w-8 p-0",
                  editor.isActive('bulletList') && "bg-accent text-accent-foreground"
                )}
                title="Bullet List"
              >
                <List className="h-4 w-4" />
              </Button>
              
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                className={cn(
                  "h-8 w-8 p-0",
                  editor.isActive('orderedList') && "bg-accent text-accent-foreground"
                )}
                title="Ordered List"
              >
                <ListOrdered className="h-4 w-4" />
              </Button>
              
              <div className="w-px h-6 bg-border mx-1" />
              
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().undo().run()}
                disabled={!editor.can().undo()}
                className="h-8 w-8 p-0"
                title="Undo"
              >
                <Undo className="h-4 w-4" />
              </Button>
              
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().redo().run()}
                disabled={!editor.can().redo()}
                className="h-8 w-8 p-0"
                title="Redo"
              >
                <Redo className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          {/* HTML Source Toggle */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setShowHTML(!showHTML);
              if (isPreviewMode) setIsPreviewMode(false);
            }}
            className={cn(
              "h-8 px-2",
              showHTML && "bg-accent text-accent-foreground"
            )}
            title="Show HTML Source"
          >
            <Code className="h-4 w-4 mr-1" />
            <span className="text-xs font-mono">&lt; &gt;</span>
          </Button>

          {/* Preview Toggle */}
          {!showHTML && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsPreviewMode(!isPreviewMode)}
              className="h-8 px-2"
            >
              {isPreviewMode ? (
                <>
                  <Edit3 className="h-4 w-4 mr-1" />
                  Edit
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4 mr-1" />
                  Preview
                </>
              )}
            </Button>
          )}
        </div>
      </div>
      
      {/* Editor Content, HTML Source, or Preview */}
      {showHTML ? (
        <div className="p-0">
          <Textarea
            value={editor.getHTML()}
            onChange={handleHtmlChange}
            className="font-mono text-sm min-h-[200px] border-0 focus-visible:ring-0 rounded-none resize-y"
            placeholder="Enter raw HTML here..."
          />
        </div>
      ) : isPreviewMode ? (
        <div className="p-3 min-h-[120px]">
          {content ? (
            <AIContentDisplay 
              content={content} 
              className="product-description"
            />
          ) : (
            <p className="text-muted-foreground text-sm italic">{placeholder}</p>
          )}
        </div>
      ) : (
        <EditorContent 
          editor={editor} 
          className="ai-generated-content product-description"
        />
      )}
    </div>
  );
}
