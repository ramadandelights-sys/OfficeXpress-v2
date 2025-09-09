import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Calendar, Eye, Save, Send, Tag, Image, Clock, Search, Edit, Bold, Italic, Underline, List, ListOrdered, Link, Type, AlignLeft, AlignCenter, AlignRight, Strikethrough, Subscript, Superscript, Quote, Code, Table, Minus, Undo, Redo, Palette, Highlighter, Plus, Minus as FontDecrease, CheckSquare, Copy, Paste, RotateCcw } from "lucide-react";
import ImageUploader from "./ImageUploader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { insertBlogPostSchema } from "@shared/schema";
import { z } from "zod";

const advancedBlogPostSchema = insertBlogPostSchema.extend({
  tags: z.array(z.string()).default([]),
  metaDescription: z.string().optional(),
  metaKeywords: z.string().optional(),
  readTime: z.number().min(1).max(60).default(5),
  author: z.string().default("OfficeXpress Team"),
  scheduledFor: z.string().optional(),
});

type AdvancedBlogPost = z.infer<typeof advancedBlogPostSchema>;

interface BlogPostCreatorProps {
  onSave: (data: AdvancedBlogPost) => void;
  isLoading: boolean;
  onCancel?: () => void;
}

export default function BlogPostCreator({ onSave, isLoading, onCancel }: BlogPostCreatorProps) {
  const { toast } = useToast();
  const [newTag, setNewTag] = useState("");
  const [wordCount, setWordCount] = useState(0);
  const [previewMode, setPreviewMode] = useState(false);
  const [showContentImageUploader, setShowContentImageUploader] = useState(false);
  const [isRichTextMode, setIsRichTextMode] = useState(true);
  const contentRef = useRef<HTMLDivElement>(null);
  const [fontSize, setFontSize] = useState(14);
  const [fontFamily, setFontFamily] = useState('Arial');
  const [textColor, setTextColor] = useState('#000000');
  const [highlightColor, setHighlightColor] = useState('#ffff00');
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  const [showFontSelector, setShowFontSelector] = useState(false);
  const [showInsertMenu, setShowInsertMenu] = useState(false);

  const form = useForm<AdvancedBlogPost>({
    resolver: zodResolver(advancedBlogPostSchema),
    defaultValues: {
      title: "",
      slug: "",
      content: "",
      excerpt: "",
      category: "Transportation",
      tags: [],
      featuredImage: "",
      metaDescription: "",
      metaKeywords: "",
      readTime: 5,
      published: false,
      author: "OfficeXpress Team",
      scheduledFor: "",
    },
  });

  const watchedTitle = form.watch("title");
  const watchedContent = form.watch("content");
  const watchedTags = form.watch("tags");

  // Sync content between rich text editor and form state
  useEffect(() => {
    if (contentRef.current && watchedContent && contentRef.current.innerHTML !== watchedContent) {
      contentRef.current.innerHTML = watchedContent;
    }
  }, [watchedContent]);

  // Ensure content is always synced when component unmounts or user navigates
  useEffect(() => {
    const syncContent = () => {
      if (contentRef.current) {
        const currentContent = contentRef.current.innerHTML;
        if (currentContent !== form.getValues("content")) {
          form.setValue("content", currentContent);
          handleRichTextChange();
        }
      }
    };

    // Sync content when user clicks away or navigates
    const handleBeforeUnload = () => syncContent();
    const handleVisibilityChange = () => syncContent();
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      syncContent(); // Sync on cleanup
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Auto-generate slug from title
  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
  };

  // Update slug when title changes
  const handleTitleChange = (title: string) => {
    form.setValue("title", title);
    const slug = generateSlug(title);
    form.setValue("slug", slug);
  };

  // Update word count and reading time
  const handleContentChange = (content: string) => {
    form.setValue("content", content);
    const words = content.trim().split(/\s+/).length;
    setWordCount(words);
    const readTime = Math.max(1, Math.ceil(words / 200)); // ~200 words per minute
    form.setValue("readTime", readTime);
  };

  // Handle image insertion into content
  const insertImageIntoContent = (imageUrl: string) => {
    const currentContent = form.getValues("content");
    const imageMarkdown = `\n\n![Image](${imageUrl})\n\n`;
    const newContent = currentContent + imageMarkdown;
    form.setValue("content", newContent);
    handleContentChange(newContent);
    setShowContentImageUploader(false);
    toast({
      title: "Image inserted",
      description: "The image has been added to your blog content"
    });
  };

  // Enhanced rich text editor functions
  const saveToUndoStack = () => {
    if (contentRef.current) {
      setUndoStack(prev => [...prev.slice(-19), contentRef.current!.innerHTML]);
      setRedoStack([]);
    }
  };

  const executeCommand = (command: string, value?: string) => {
    saveToUndoStack();
    document.execCommand(command, false, value);
    handleRichTextChange();
  };

  const executeUndo = () => {
    if (undoStack.length > 0) {
      const lastState = undoStack[undoStack.length - 1];
      if (contentRef.current) {
        setRedoStack(prev => [contentRef.current!.innerHTML, ...prev.slice(0, 19)]);
        contentRef.current.innerHTML = lastState;
        setUndoStack(prev => prev.slice(0, -1));
        handleRichTextChange();
      }
    }
  };

  const executeRedo = () => {
    if (redoStack.length > 0) {
      const nextState = redoStack[0];
      if (contentRef.current) {
        setUndoStack(prev => [...prev.slice(-19), contentRef.current!.innerHTML]);
        contentRef.current.innerHTML = nextState;
        setRedoStack(prev => prev.slice(1));
        handleRichTextChange();
      }
    }
  };

  const insertLink = () => {
    const url = prompt('Enter URL:');
    if (url) {
      executeCommand('createLink', url);
    }
  };

  const insertImage = () => {
    const url = prompt('Enter image URL:');
    if (url) {
      executeCommand('insertImage', url);
    }
  };

  const insertTable = () => {
    const rows = prompt('Number of rows:') || '3';
    const cols = prompt('Number of columns:') || '3';
    const headerBg = prompt('Header background color (optional, e.g., #f0f0f0):') || '#f8f9fa';
    const cellBg = prompt('Cell background color (optional, e.g., #ffffff):') || '#ffffff';
    const borderColor = prompt('Border color (optional, e.g., #ccc):') || '#dee2e6';
    
    const numRows = parseInt(rows);
    const numCols = parseInt(cols);
    
    const headerRow = `<tr style="background-color: ${headerBg};">${Array.from({length: numCols}, (_, i) => 
      `<th style="padding: 12px; border: 1px solid ${borderColor}; font-weight: bold; text-align: left;">Header ${i + 1}</th>`
    ).join('')}</tr>`;
    
    const bodyRows = Array.from({length: numRows - 1}, () => 
      `<tr>${Array.from({length: numCols}, () => 
        `<td style="padding: 8px; border: 1px solid ${borderColor}; background-color: ${cellBg};">&nbsp;</td>`
      ).join('')}</tr>`
    ).join('');
    
    const tableHTML = `
      <table style="border-collapse: collapse; width: 100%; margin: 16px 0;">
        ${headerRow}
        ${bodyRows}
      </table>
    `;
    executeCommand('insertHTML', tableHTML);
  };

  const insertHeading = (level: number) => {
    executeCommand('formatBlock', `h${level}`);
  };

  const changeFontSize = (size: number) => {
    setFontSize(size);
    executeCommand('fontSize', '7'); // Use size 7 then change with CSS
    if (contentRef.current) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const span = document.createElement('span');
        span.style.fontSize = `${size}px`;
        try {
          range.surroundContents(span);
        } catch (e) {
          span.appendChild(range.extractContents());
          range.insertNode(span);
        }
      }
    }
  };

  const changeFontFamily = (family: string) => {
    setFontFamily(family);
    if (contentRef.current) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        if (!range.collapsed) {
          const span = document.createElement('span');
          span.style.fontFamily = family;
          try {
            range.surroundContents(span);
          } catch (e) {
            span.appendChild(range.extractContents());
            range.insertNode(span);
          }
          handleRichTextChange();
        }
      }
    }
  };

  const changeTextColor = (color: string) => {
    setTextColor(color);
    if (contentRef.current) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        if (!range.collapsed) {
          const span = document.createElement('span');
          span.style.color = color;
          try {
            range.surroundContents(span);
          } catch (e) {
            span.appendChild(range.extractContents());
            range.insertNode(span);
          }
          handleRichTextChange();
        }
      }
    }
  };

  const changeHighlightColor = (color: string) => {
    setHighlightColor(color);
    if (contentRef.current) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        if (!range.collapsed) {
          const span = document.createElement('span');
          span.style.backgroundColor = color;
          try {
            range.surroundContents(span);
          } catch (e) {
            span.appendChild(range.extractContents());
            range.insertNode(span);
          }
          handleRichTextChange();
        }
      }
    }
  };

  const insertSpecialContent = (type: string) => {
    switch (type) {
      case 'hr':
        executeCommand('insertHTML', '<hr style="border: 1px solid #ccc; margin: 20px 0;">');
        break;
      case 'blockquote':
        executeCommand('formatBlock', 'blockquote');
        break;
      case 'code':
        executeCommand('insertHTML', '<code style="background: #f5f5f5; padding: 2px 4px; border-radius: 3px; font-family: monospace;"></code>');
        break;
      case 'checklist':
        executeCommand('insertHTML', '<p><input type="checkbox" disabled> </p>');
        break;
    }
  };

  const handleRichTextChange = () => {
    if (contentRef.current) {
      const content = contentRef.current.innerHTML;
      const textContent = contentRef.current.textContent || contentRef.current.innerText || '';
      form.setValue("content", content);
      const words = textContent.trim().split(/\s+/).filter(word => word.length > 0).length;
      setWordCount(words);
      const readTime = Math.max(1, Math.ceil(words / 200));
      form.setValue("readTime", readTime);
    }
  };

  const clearEditor = () => {
    if (contentRef.current) {
      saveToUndoStack();
      contentRef.current.innerHTML = '<p><br></p>';
      handleRichTextChange();
    }
  };

  const convertToMarkdown = (html: string) => {
    // Simple HTML to Markdown conversion
    return html
      .replace(/<h([1-6])>/g, (match, level) => '#'.repeat(parseInt(level)) + ' ')
      .replace(/<\/h[1-6]>/g, '\n\n')
      .replace(/<b>|<strong>/g, '**')
      .replace(/<\/b>|<\/strong>/g, '**')
      .replace(/<i>|<em>/g, '*')
      .replace(/<\/i>|<\/em>/g, '*')
      .replace(/<u>/g, '<u>')
      .replace(/<\/u>/g, '</u>')
      .replace(/<a href="([^"]+)">([^<]+)<\/a>/g, '[$2]($1)')
      .replace(/<ul>/g, '\n')
      .replace(/<\/ul>/g, '\n')
      .replace(/<ol>/g, '\n')
      .replace(/<\/ol>/g, '\n')
      .replace(/<li>/g, '- ')
      .replace(/<\/li>/g, '\n')
      .replace(/<p>/g, '')
      .replace(/<\/p>/g, '\n\n')
      .replace(/<br\s*\/?>/g, '\n')
      .replace(/<[^>]+>/g, '')
      .trim();
  };

  const convertFromMarkdown = (markdown: string) => {
    // Simple Markdown to HTML conversion
    return markdown
      .replace(/^(#{1,6})\s(.+)$/gm, (match, hashes, text) => `<h${hashes.length}>${text}</h${hashes.length}>`)
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/<u>([^<]+)<\/u>/g, '<u>$1</u>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
      .replace(/^-\s(.+)$/gm, '<li>$1</li>')
      .replace(/((<li>.*<\/li>\s*)+)/gs, '<ul>$1</ul>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/^(.+)$/gm, (match) => {
        if (match.startsWith('<') || match.trim() === '') return match;
        return `<p>${match}</p>`;
      })
      .replace(/^<p><\/p>$/gm, '')
      .replace(/^<p>(<[^>]+>)/gm, '$1')
      .replace(/(<\/[^>]+>)<\/p>$/gm, '$1');
  };

  // Add tag functionality
  const addTag = () => {
    if (newTag.trim() && !watchedTags.includes(newTag.trim())) {
      const updatedTags = [...watchedTags, newTag.trim()];
      form.setValue("tags", updatedTags);
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    const updatedTags = watchedTags.filter(tag => tag !== tagToRemove);
    form.setValue("tags", updatedTags);
  };

  const onSubmit = (data: AdvancedBlogPost) => {
    // Auto-generate excerpt if empty
    if (!data.excerpt && data.content) {
      data.excerpt = data.content.slice(0, 150) + "...";
    }
    
    // Auto-generate meta description if empty
    if (!data.metaDescription && data.excerpt) {
      data.metaDescription = data.excerpt;
    }

    onSave(data);
  };

  return (
    <Card className="w-full max-w-6xl mx-auto">
      <CardHeader className="border-b">
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Create New Blog Post
          </CardTitle>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setPreviewMode(!previewMode)}
              className="flex items-center gap-2"
            >
              <Eye className="h-4 w-4" />
              {previewMode ? "Edit" : "Preview"}
            </Button>
            {onCancel && (
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-6">
        {previewMode ? (
          <BlogPostPreview 
            title={watchedTitle}
            content={watchedContent}
            tags={watchedTags}
            readTime={form.watch("readTime")}
            author={form.watch("author")}
          />
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Tabs 
                defaultValue="content" 
                className="w-full"
                onValueChange={() => {
                  // Sync content when switching tabs
                  if (contentRef.current) {
                    const currentContent = contentRef.current.innerHTML;
                    form.setValue("content", currentContent);
                    handleRichTextChange();
                  }
                }}
              >
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="content">Content</TabsTrigger>
                  <TabsTrigger value="seo">SEO & Meta</TabsTrigger>
                  <TabsTrigger value="settings">Settings</TabsTrigger>
                  <TabsTrigger value="publishing">Publishing</TabsTrigger>
                </TabsList>

                <TabsContent value="content" className="space-y-6">
                  {/* Title and Slug */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Title *</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              onChange={(e) => {
                                field.onChange(e);
                                handleTitleChange(e.target.value);
                              }}
                              placeholder="Enter compelling blog post title..."
                              data-testid="input-blog-title"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="slug"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>URL Slug</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              placeholder="url-friendly-slug"
                              data-testid="input-blog-slug"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Content Area */}
                  <FormField
                    control={form.control}
                    name="content"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center justify-between">
                          Content *
                          <div className="flex items-center gap-4">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={clearEditor}
                              className="flex items-center gap-1"
                            >
                              <RotateCcw className="h-3 w-3" />
                              Clear
                            </Button>
                            <span className="text-sm text-muted-foreground">
                              {wordCount} words • {form.watch("readTime")} min read
                            </span>
                          </div>
                        </FormLabel>
                        {showContentImageUploader && (
                          <div className="border rounded-lg p-4 bg-gray-50 mb-2">
                            <ImageUploader
                              onImageUpload={insertImageIntoContent}
                              buttonText="Upload Image for Content"
                              className="w-full"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setShowContentImageUploader(false)}
                              className="mt-2"
                            >
                              Cancel
                            </Button>
                          </div>
                        )}
                        <div className="space-y-2">
                          {/* Comprehensive Google Docs-style Toolbar */}
                          <div className="border rounded-t-lg bg-gray-50 p-3 space-y-2">
                            {/* First Row: Undo/Redo, Font, Size, Format */}
                            <div className="flex items-center gap-2 flex-wrap">
                              {/* Undo/Redo */}
                              <div className="flex items-center gap-1 border-r pr-2 mr-2">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={executeUndo}
                                  disabled={undoStack.length === 0}
                                  className="h-8 w-8 p-0"
                                  title="Undo"
                                >
                                  <Undo className="h-4 w-4" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={executeRedo}
                                  disabled={redoStack.length === 0}
                                  className="h-8 w-8 p-0"
                                  title="Redo"
                                >
                                  <Redo className="h-4 w-4" />
                                </Button>
                              </div>

                              {/* Font Family */}
                              <div className="relative">
                                <Select value={fontFamily} onValueChange={changeFontFamily}>
                                  <SelectTrigger className="w-32 h-8">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Arial">Arial</SelectItem>
                                    <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                                    <SelectItem value="Helvetica">Helvetica</SelectItem>
                                    <SelectItem value="Georgia">Georgia</SelectItem>
                                    <SelectItem value="Verdana">Verdana</SelectItem>
                                    <SelectItem value="Courier New">Courier New</SelectItem>
                                    <SelectItem value="Calibri">Calibri</SelectItem>
                                    <SelectItem value="Roboto">Roboto</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              {/* Font Size */}
                              <div className="flex items-center gap-1">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => changeFontSize(Math.max(8, fontSize - 2))}
                                  className="h-8 w-8 p-0"
                                  title="Decrease Font Size"
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <Input
                                  type="number"
                                  value={fontSize}
                                  onChange={(e) => changeFontSize(parseInt(e.target.value) || 14)}
                                  className="w-16 h-8 text-center"
                                  min="8"
                                  max="72"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => changeFontSize(Math.min(72, fontSize + 2))}
                                  className="h-8 w-8 p-0"
                                  title="Increase Font Size"
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>

                              {/* Text Formatting */}
                              <div className="flex items-center gap-1 border-l pl-2 ml-2">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => executeCommand('bold')}
                                  className="h-8 w-8 p-0"
                                  title="Bold"
                                >
                                  <Bold className="h-4 w-4" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => executeCommand('italic')}
                                  className="h-8 w-8 p-0"
                                  title="Italic"
                                >
                                  <Italic className="h-4 w-4" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => executeCommand('underline')}
                                  className="h-8 w-8 p-0"
                                  title="Underline"
                                >
                                  <Underline className="h-4 w-4" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => executeCommand('strikeThrough')}
                                  className="h-8 w-8 p-0"
                                  title="Strikethrough"
                                >
                                  <Strikethrough className="h-4 w-4" />
                                </Button>
                              </div>

                              {/* Text Color & Highlight */}
                              <div className="flex items-center gap-1 border-l pl-2 ml-2">
                                <div className="relative">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowColorPicker(!showColorPicker)}
                                    className="h-8 w-8 p-0"
                                    title="Text Color"
                                  >
                                    <Palette className="h-4 w-4" />
                                  </Button>
                                  {showColorPicker && (
                                    <div className="absolute top-10 left-0 z-50 bg-white border rounded-lg p-3 shadow-lg min-w-48">
                                      <div className="space-y-3">
                                        <div className="text-xs font-medium text-gray-700 mb-2">Text Color</div>
                                        <div className="grid grid-cols-6 gap-2">
                                          {['#000000', '#333333', '#666666', '#999999', '#cccccc', '#ffffff',
                                            '#ff0000', '#ff6600', '#ffcc00', '#00ff00', '#0066ff', '#6600ff',
                                            '#ff0066', '#00ffff', '#ffff00', '#ff00ff', '#00ff66', '#6666ff'].map((color) => (
                                            <button
                                              key={color}
                                              onClick={() => {
                                                changeTextColor(color);
                                                setShowColorPicker(false);
                                              }}
                                              className="w-6 h-6 rounded border border-gray-300 hover:border-gray-500"
                                              style={{ backgroundColor: color }}
                                              title={color}
                                            />
                                          ))}
                                        </div>
                                        <div className="border-t pt-2">
                                          <label className="text-xs text-gray-600 mb-1 block">Custom Color:</label>
                                          <input
                                            type="color"
                                            value={textColor}
                                            onChange={(e) => {
                                              changeTextColor(e.target.value);
                                              setShowColorPicker(false);
                                            }}
                                            className="w-full h-8 rounded border"
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                                <div className="relative">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowHighlightPicker(!showHighlightPicker)}
                                    className="h-8 w-8 p-0"
                                    title="Highlight Color"
                                  >
                                    <Highlighter className="h-4 w-4" />
                                  </Button>
                                  {showHighlightPicker && (
                                    <div className="absolute top-10 left-0 z-50 bg-white border rounded-lg p-3 shadow-lg min-w-48">
                                      <div className="space-y-3">
                                        <div className="text-xs font-medium text-gray-700 mb-2">Highlight Color</div>
                                        <div className="grid grid-cols-6 gap-2">
                                          {['#ffff00', '#00ffff', '#ff00ff', '#00ff00', '#ff6600', '#ff0000',
                                            '#ffffcc', '#ccffff', '#ffccff', '#ccffcc', '#ffddcc', '#ffcccc',
                                            '#fff2cc', '#cce6ff', '#e6ccff', '#d4f1d4', '#ffe6cc', '#ffd6cc'].map((color) => (
                                            <button
                                              key={color}
                                              onClick={() => {
                                                changeHighlightColor(color);
                                                setShowHighlightPicker(false);
                                              }}
                                              className="w-6 h-6 rounded border border-gray-300 hover:border-gray-500"
                                              style={{ backgroundColor: color }}
                                              title={color}
                                            />
                                          ))}
                                        </div>
                                        <div className="border-t pt-2">
                                          <label className="text-xs text-gray-600 mb-1 block">Custom Color:</label>
                                          <input
                                            type="color"
                                            value={highlightColor}
                                            onChange={(e) => {
                                              changeHighlightColor(e.target.value);
                                              setShowHighlightPicker(false);
                                            }}
                                            className="w-full h-8 rounded border"
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Second Row: Headings, Lists, Alignment */}
                            <div className="flex items-center gap-2 flex-wrap">
                              {/* Headings */}
                              <div className="flex items-center gap-1 border-r pr-2 mr-2">
                                <Select onValueChange={(value) => insertHeading(parseInt(value))}>
                                  <SelectTrigger className="w-20 h-8">
                                    <SelectValue placeholder="H1" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="1">H1</SelectItem>
                                    <SelectItem value="2">H2</SelectItem>
                                    <SelectItem value="3">H3</SelectItem>
                                    <SelectItem value="4">H4</SelectItem>
                                    <SelectItem value="5">H5</SelectItem>
                                    <SelectItem value="6">H6</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              {/* Lists */}
                              <div className="flex items-center gap-1 border-r pr-2 mr-2">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => executeCommand('insertUnorderedList')}
                                  className="h-8 w-8 p-0"
                                  title="Bullet List"
                                >
                                  <List className="h-4 w-4" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => executeCommand('insertOrderedList')}
                                  className="h-8 w-8 p-0"
                                  title="Numbered List"
                                >
                                  <ListOrdered className="h-4 w-4" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => insertSpecialContent('checklist')}
                                  className="h-8 w-8 p-0"
                                  title="Checklist"
                                >
                                  <CheckSquare className="h-4 w-4" />
                                </Button>
                              </div>

                              {/* Alignment */}
                              <div className="flex items-center gap-1 border-r pr-2 mr-2">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => executeCommand('justifyLeft')}
                                  className="h-8 w-8 p-0"
                                  title="Align Left"
                                >
                                  <AlignLeft className="h-4 w-4" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => executeCommand('justifyCenter')}
                                  className="h-8 w-8 p-0"
                                  title="Align Center"
                                >
                                  <AlignCenter className="h-4 w-4" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => executeCommand('justifyRight')}
                                  className="h-8 w-8 p-0"
                                  title="Align Right"
                                >
                                  <AlignRight className="h-4 w-4" />
                                </Button>
                              </div>

                              {/* Insert Options */}
                              <div className="flex items-center gap-1">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={insertLink}
                                  className="h-8 w-8 p-0"
                                  title="Insert Link"
                                >
                                  <Link className="h-4 w-4" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setShowContentImageUploader(true)}
                                  className="h-8 w-8 p-0"
                                  title="Upload Image"
                                >
                                  <Image className="h-4 w-4" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={insertTable}
                                  className="h-8 w-8 p-0"
                                  title="Insert Table"
                                >
                                  <Table className="h-4 w-4" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => insertSpecialContent('hr')}
                                  className="h-8 w-8 p-0"
                                  title="Insert Horizontal Rule"
                                >
                                  <Minus className="h-4 w-4" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => insertSpecialContent('blockquote')}
                                  className="h-8 w-8 p-0"
                                  title="Quote"
                                >
                                  <Quote className="h-4 w-4" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => insertSpecialContent('code')}
                                  className="h-8 w-8 p-0"
                                  title="Code"
                                >
                                  <Code className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                          
                          {/* Rich Text Editor */}
                          <FormControl>
                            <div
                              ref={contentRef}
                              contentEditable
                              onInput={handleRichTextChange}
                              onBlur={() => {
                                if (contentRef.current) {
                                  field.onChange(contentRef.current.innerHTML);
                                }
                              }}
                              onFocus={() => {
                                if (contentRef.current && (contentRef.current.innerHTML === '<p><br></p>' || contentRef.current.innerHTML === '')) {
                                  contentRef.current.innerHTML = '';
                                  contentRef.current.focus();
                                }
                              }}
                              onClick={() => {
                                if (contentRef.current && contentRef.current.innerHTML === '') {
                                  contentRef.current.focus();
                                }
                              }}
                              className="min-h-[400px] border rounded-b-lg p-4 focus:outline-none focus:ring-2 focus:ring-ring bg-white prose max-w-none"
                              style={{ 
                                maxHeight: '600px', 
                                overflowY: 'auto',
                                fontSize: `${fontSize}px`,
                                fontFamily: fontFamily
                              }}
                              data-testid="rich-text-editor"
                              suppressContentEditableWarning={true}
                            />
                          </FormControl>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Image Uploader Modal for Content */}
                  {showContentImageUploader && (
                    <div className="mt-4 p-4 border rounded-lg bg-gray-50">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-medium">Upload Image to Content</h4>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowContentImageUploader(false)}
                          className="h-8 w-8 p-0"
                        >
                          ×
                        </Button>
                      </div>
                      <ImageUploader
                        onImageUpload={insertImageIntoContent}
                        currentImage=""
                        buttonText="Choose Image File"
                        className="w-full"
                      />
                    </div>
                  )}

                  {/* Excerpt */}
                  <FormField
                    control={form.control}
                    name="excerpt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Excerpt</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field}
                            rows={3}
                            placeholder="Brief summary of the post (auto-generated if left empty)..."
                            data-testid="input-blog-excerpt"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>

                <TabsContent value="seo" className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="metaDescription"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Meta Description</FormLabel>
                            <FormControl>
                              <Textarea 
                                {...field}
                                rows={3}
                                maxLength={160}
                                placeholder="SEO meta description (150-160 characters)..."
                                data-testid="input-meta-description"
                              />
                            </FormControl>
                            <p className="text-xs text-muted-foreground">
                              {field.value?.length || 0}/160 characters
                            </p>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="metaKeywords"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Meta Keywords</FormLabel>
                            <FormControl>
                              <Input 
                                {...field}
                                placeholder="transportation, business, logistics..."
                                data-testid="input-meta-keywords"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="featuredImage"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <Image className="h-4 w-4" />
                              Featured Image
                            </FormLabel>
                            <FormControl>
                              <ImageUploader
                                onImageUpload={field.onChange}
                                currentImage={field.value || ""}
                                buttonText="Upload Featured Image"
                                className="w-full"
                              />
                            </FormControl>
                            <FormMessage />
                            <p className="text-xs text-gray-500 mt-1">
                              Upload an image for your blog post preview (max 5MB)
                            </p>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="readTime"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              Reading Time (minutes)
                            </FormLabel>
                            <FormControl>
                              <Input 
                                {...field}
                                type="number"
                                min="1"
                                max="60"
                                onChange={(e) => field.onChange(Number(e.target.value))}
                                data-testid="input-read-time"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="settings" className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="category"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Category</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-category">
                                  <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Transportation">Transportation</SelectItem>
                                <SelectItem value="Business Solutions">Business Solutions</SelectItem>
                                <SelectItem value="Company News">Company News</SelectItem>
                                <SelectItem value="Industry Insights">Industry Insights</SelectItem>
                                <SelectItem value="Technology">Technology</SelectItem>
                                <SelectItem value="Sustainability">Sustainability</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="author"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Author</FormLabel>
                            <FormControl>
                              <Input 
                                {...field}
                                placeholder="Author name"
                                data-testid="input-author"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="space-y-4">
                      <div>
                        <FormLabel className="flex items-center gap-2 mb-3">
                          <Tag className="h-4 w-4" />
                          Tags
                        </FormLabel>
                        <div className="flex gap-2 mb-3">
                          <Input
                            value={newTag}
                            onChange={(e) => setNewTag(e.target.value)}
                            placeholder="Add tag..."
                            onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                            data-testid="input-new-tag"
                          />
                          <Button type="button" onClick={addTag} variant="outline">
                            Add
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {watchedTags.map((tag, index) => (
                            <Badge 
                              key={index} 
                              variant="secondary" 
                              className="cursor-pointer"
                              onClick={() => removeTag(tag)}
                              data-testid={`tag-${tag}`}
                            >
                              {tag} ×
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="publishing" className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="published"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">
                                Publish Immediately
                              </FormLabel>
                              <div className="text-sm text-muted-foreground">
                                Make this post live on the website
                              </div>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value || false}
                                onCheckedChange={field.onChange}
                                data-testid="switch-published"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="scheduledFor"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              Schedule for Later
                            </FormLabel>
                            <FormControl>
                              <Input 
                                {...field}
                                type="datetime-local"
                                data-testid="input-scheduled-for"
                              />
                            </FormControl>
                            <p className="text-xs text-muted-foreground">
                              Leave empty to publish immediately when published is enabled
                            </p>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="space-y-4">
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm">Publishing Checklist</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${watchedTitle ? 'bg-green-500' : 'bg-gray-300'}`} />
                            Title completed
                          </div>
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${watchedContent && watchedContent.length > 100 ? 'bg-green-500' : 'bg-gray-300'}`} />
                            Content added (100+ chars)
                          </div>
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${form.watch("excerpt") ? 'bg-green-500' : 'bg-yellow-500'}`} />
                            Excerpt {form.watch("excerpt") ? 'added' : 'will be auto-generated'}
                          </div>
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${watchedTags.length > 0 ? 'bg-green-500' : 'bg-gray-300'}`} />
                            Tags added ({watchedTags.length})
                          </div>
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${form.watch("featuredImage") ? 'bg-green-500' : 'bg-gray-300'}`} />
                            Featured image {form.watch("featuredImage") ? 'added' : 'optional'}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              <Separator />

              <div className="flex justify-end gap-3">
                <Button 
                  type="submit" 
                  variant="outline"
                  disabled={isLoading}
                  onClick={() => form.setValue("published", false)}
                  className="flex items-center gap-2 text-gray-700 hover:text-gray-900"
                  data-testid="button-save-draft"
                >
                  <Save className="h-4 w-4" />
                  Save as Draft
                </Button>
                <Button 
                  type="submit"
                  disabled={isLoading}
                  onClick={() => form.setValue("published", true)}
                  className="flex items-center gap-2 bg-[#4c9096] hover:bg-[#4c9096]/90 text-white"
                  data-testid="button-publish"
                >
                  <Send className="h-4 w-4" />
                  {isLoading ? "Publishing..." : "Publish Now"}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  );
}

function BlogPostPreview({ 
  title, 
  content, 
  tags, 
  readTime, 
  author 
}: { 
  title: string; 
  content: string; 
  tags: string[]; 
  readTime: number;
  author: string;
}) {
  return (
    <div className="max-w-4xl mx-auto">
      <article className="prose prose-lg max-w-none">
        <header className="mb-8">
          <h1 className="text-4xl font-bold mb-4">{title || "Untitled Post"}</h1>
          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
            <span>By {author}</span>
            <span>•</span>
            <span>{readTime} min read</span>
            <span>•</span>
            <span>{new Date().toLocaleDateString()}</span>
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {tags.map((tag, index) => (
                <Badge key={index} variant="outline">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </header>
        
        <div 
          className={content ? "" : "text-muted-foreground"}
          dangerouslySetInnerHTML={content ? { __html: content } : undefined}
        >
          {!content && "Start writing your content..."}
        </div>
      </article>
    </div>
  );
}