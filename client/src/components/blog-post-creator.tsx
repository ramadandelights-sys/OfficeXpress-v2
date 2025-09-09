import { useState, useRef, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Calendar, Eye, Save, Send, Tag, Image, Clock, Search, Edit, Bold, Italic, Underline, List, ListOrdered, Link, Type, AlignLeft, AlignCenter, AlignRight, Strikethrough, Subscript, Superscript, Quote, Code, Table, Minus, Undo, Redo, Palette, Highlighter, Plus, Minus as FontDecrease, CheckSquare, Copy, Clipboard, RotateCcw } from "lucide-react";
import ImageUploader from "./ImageUploader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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

// Enhanced Content Manager Class
class EditorContentManager {
  private editor: HTMLDivElement | null = null;
  private history: string[] = [];
  private historyIndex: number = -1;
  public onContentChange: (content: string) => void = () => {};

  constructor() {}

  setEditor(editor: HTMLDivElement | null) {
    this.editor = editor;
  }

  setOnContentChange(callback: (content: string) => void) {
    this.onContentChange = callback;
  }

  getContent(): string {
    return this.editor?.innerHTML || '';
  }

  setContent(content: string) {
    if (this.editor) {
      this.editor.innerHTML = content;
      this.onContentChange(content);
    }
  }

  saveToHistory() {
    if (this.editor) {
      const content = this.editor.innerHTML;
      // Remove everything after current index
      this.history = this.history.slice(0, this.historyIndex + 1);
      this.history.push(content);
      this.historyIndex = this.history.length - 1;
      // Limit history size
      if (this.history.length > 50) {
        this.history.shift();
        this.historyIndex--;
      }
    }
  }

  undo(): boolean {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      const content = this.history[this.historyIndex];
      this.setContent(content);
      return true;
    }
    return false;
  }

  redo(): boolean {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      const content = this.history[this.historyIndex];
      this.setContent(content);
      return true;
    }
    return false;
  }

  // Get current selection
  private getSelection(): Range | null {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      return selection.getRangeAt(0);
    }
    return null;
  }

  // Restore selection
  private restoreSelection(range: Range) {
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }

  // Execute formatting command with proper selection handling
  formatText(command: 'bold' | 'italic' | 'underline' | 'strikethrough') {
    this.saveToHistory();
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      if (!range.collapsed) {
        try {
          const selectedText = range.toString();
          if (selectedText) {
            const span = document.createElement('span');
            
            switch (command) {
              case 'bold':
                span.style.fontWeight = 'bold';
                break;
              case 'italic':
                span.style.fontStyle = 'italic';
                break;
              case 'underline':
                span.style.textDecoration = 'underline';
                break;
              case 'strikethrough':
                span.style.textDecoration = 'line-through';
                break;
            }
            
            span.textContent = selectedText;
            range.deleteContents();
            range.insertNode(span);
            
            // Move cursor after the formatted text
            range.setStartAfter(span);
            range.collapse(true);
            this.restoreSelection(range);
            
            this.onContentChange(this.getContent());
          }
        } catch (error) {
          console.error('Error formatting text:', error);
          // Fallback: just trigger content change without formatting
          this.onContentChange(this.getContent());
        }
      }
    }
  }

  // Apply font family to selected text
  applyFontFamily(fontFamily: string) {
    this.saveToHistory();
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      if (!range.collapsed) {
        try {
          const selectedText = range.toString();
          if (selectedText) {
            const span = document.createElement('span');
            span.style.fontFamily = fontFamily;
            span.textContent = selectedText;
            range.deleteContents();
            range.insertNode(span);
            
            range.setStartAfter(span);
            range.collapse(true);
            this.restoreSelection(range);
            
            this.onContentChange(this.getContent());
          }
        } catch (error) {
          console.error('Error applying font family:', error);
          this.onContentChange(this.getContent());
        }
      }
    }
  }

  // Apply text color to selected text
  applyTextColor(color: string) {
    this.saveToHistory();
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      if (!range.collapsed) {
        try {
          const selectedText = range.toString();
          if (selectedText) {
            const span = document.createElement('span');
            span.style.color = color;
            span.textContent = selectedText;
            range.deleteContents();
            range.insertNode(span);
            
            range.setStartAfter(span);
            range.collapse(true);
            this.restoreSelection(range);
            
            this.onContentChange(this.getContent());
          }
        } catch (error) {
          console.error('Error applying text color:', error);
          this.onContentChange(this.getContent());
        }
      }
    }
  }

  // Apply highlight color to selected text
  applyHighlightColor(color: string) {
    this.saveToHistory();
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      if (!range.collapsed) {
        try {
          const selectedText = range.toString();
          if (selectedText) {
            const span = document.createElement('span');
            span.style.backgroundColor = color;
            span.textContent = selectedText;
            range.deleteContents();
            range.insertNode(span);
            
            range.setStartAfter(span);
            range.collapse(true);
            this.restoreSelection(range);
            
            this.onContentChange(this.getContent());
          }
        } catch (error) {
          console.error('Error applying highlight color:', error);
          this.onContentChange(this.getContent());
        }
      }
    }
  }

  // Insert table with proper positioning
  insertTable(config: {
    rows: number;
    cols: number;
    headerBg: string;
    cellBg: string;
    borderColor: string;
    headerTextColor: string;
    cellTextColor: string;
  }) {
    this.saveToHistory();
    
    const { rows, cols, headerBg, cellBg, borderColor, headerTextColor, cellTextColor } = config;
    
    const table = document.createElement('table');
    table.style.borderCollapse = 'collapse';
    table.style.width = '100%';
    table.style.margin = '16px 0';
    table.style.border = `1px solid ${borderColor}`;
    
    // Create header row
    const headerRow = document.createElement('tr');
    headerRow.style.backgroundColor = headerBg;
    
    for (let i = 0; i < cols; i++) {
      const th = document.createElement('th');
      th.style.padding = '12px';
      th.style.border = `1px solid ${borderColor}`;
      th.style.fontWeight = 'bold';
      th.style.textAlign = 'left';
      th.style.color = headerTextColor;
      th.textContent = `Header ${i + 1}`;
      th.contentEditable = 'true';
      headerRow.appendChild(th);
    }
    
    table.appendChild(headerRow);
    
    // Create body rows
    for (let i = 1; i < rows; i++) {
      const row = document.createElement('tr');
      for (let j = 0; j < cols; j++) {
        const td = document.createElement('td');
        td.style.padding = '8px';
        td.style.border = `1px solid ${borderColor}`;
        td.style.backgroundColor = cellBg;
        td.style.color = cellTextColor;
        td.textContent = `Cell ${i},${j + 1}`;
        td.contentEditable = 'true';
        row.appendChild(td);
      }
      table.appendChild(row);
    }
    
    // Insert table - use a more reliable approach
    if (this.editor) {
      try {
        // Focus the editor first to ensure it's active
        this.editor.focus();
        
        // Create a div wrapper for better handling
        const tableWrapper = document.createElement('div');
        tableWrapper.style.margin = '16px 0';
        tableWrapper.appendChild(table);
        
        // Try to insert at cursor position, fallback to append
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0 && this.editor.contains(selection.anchorNode)) {
          const range = selection.getRangeAt(0);
          
          // Delete any selected content first
          if (!range.collapsed) {
            range.deleteContents();
          }
          
          range.insertNode(tableWrapper);
          
          // Move cursor after the table
          range.setStartAfter(tableWrapper);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
        } else {
          // No valid selection, append to end with line breaks for better formatting
          const br = document.createElement('br');
          this.editor.appendChild(br);
          this.editor.appendChild(tableWrapper);
          const br2 = document.createElement('br');
          this.editor.appendChild(br2);
          
          // Set cursor after the table
          const range = document.createRange();
          range.setStartAfter(br2);
          range.collapse(true);
          selection?.removeAllRanges();
          selection?.addRange(range);
        }
      } catch (error) {
        console.warn('Range manipulation failed, appending table to end:', error);
        // Fallback: simple append
        const tableWrapper = document.createElement('div');
        tableWrapper.style.margin = '16px 0';
        tableWrapper.appendChild(table);
        this.editor.appendChild(tableWrapper);
      }
    }
    
    this.onContentChange(this.getContent());
  }

  // Insert image
  insertImage(url: string, alt: string = 'Image', width: string = 'auto') {
    this.saveToHistory();
    
    const img = document.createElement('img');
    img.src = url;
    img.alt = alt;
    img.style.maxWidth = width;
    img.style.height = 'auto';
    img.style.margin = '8px 0';
    
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.insertNode(img);
      
      range.setStartAfter(img);
      range.collapse(true);
      this.restoreSelection(range);
    } else if (this.editor) {
      this.editor.appendChild(img);
    }
    
    this.onContentChange(this.getContent());
  }

  // Create list
  createList(ordered: boolean = false) {
    this.saveToHistory();
    
    const list = document.createElement(ordered ? 'ol' : 'ul');
    const listItem = document.createElement('li');
    listItem.textContent = 'List item';
    list.appendChild(listItem);
    
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.insertNode(list);
      
      // Place cursor inside the list item
      try {
        if (listItem.firstChild) {
          range.setStart(listItem.firstChild, 0);
          range.setEnd(listItem.firstChild, listItem.textContent?.length || 0);
          this.restoreSelection(range);
        }
      } catch (error) {
        console.error('Error placing cursor in list:', error);
      }
    } else if (this.editor) {
      this.editor.appendChild(list);
    }
    
    this.onContentChange(this.getContent());
  }

  // Insert heading
  insertHeading(level: number) {
    this.saveToHistory();
    
    const heading = document.createElement(`h${level}`);
    heading.textContent = `Heading ${level}`;
    
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      
      // Delete any selected content first
      if (!range.collapsed) {
        range.deleteContents();
      }
      
      range.insertNode(heading);
      
      // Place cursor inside heading - select all text
      try {
        if (heading.firstChild) {
          range.setStart(heading.firstChild, 0);
          range.setEnd(heading.firstChild, heading.textContent?.length || 0);
          this.restoreSelection(range);
        }
      } catch (error) {
        console.error('Error setting heading selection:', error);
      }
    } else if (this.editor) {
      this.editor.appendChild(heading);
    }
    
    this.onContentChange(this.getContent());
  }

  // Clear all content
  clear() {
    this.saveToHistory();
    if (this.editor) {
      this.editor.innerHTML = '';
      this.onContentChange('');
    }
  }
}

export default function BlogPostCreator({ onSave, isLoading, onCancel }: BlogPostCreatorProps) {
  const { toast } = useToast();
  const [newTag, setNewTag] = useState("");
  const [wordCount, setWordCount] = useState(0);
  const [previewMode, setPreviewMode] = useState(false);
  const [showContentImageUploader, setShowContentImageUploader] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  const [showTableModal, setShowTableModal] = useState(false);
  const [textColor, setTextColor] = useState('#000000');
  const [highlightColor, setHighlightColor] = useState('#ffff00');
  const [fontFamily, setFontFamily] = useState('Arial');
  
  // Content manager instance
  const [contentManager] = useState(() => new EditorContentManager());
  
  // Table configuration
  const [tableConfig, setTableConfig] = useState({
    rows: 3,
    cols: 3,
    headerBg: '#f8f9fa',
    cellBg: '#ffffff',
    borderColor: '#dee2e6',
    headerTextColor: '#000000',
    cellTextColor: '#000000'
  });

  const form = useForm<AdvancedBlogPost>({
    resolver: zodResolver(advancedBlogPostSchema),
    defaultValues: {
      title: "",
      slug: "",
      content: "",
      excerpt: "",
      category: "Transportation",
      tags: [],
      metaDescription: "",
      metaKeywords: "",
      readTime: 5,
      author: "OfficeXpress Team",
      published: false,
      scheduledFor: "",
      featuredImage: "",
    },
  });

  // Watch form values for preview
  const watchedTitle = form.watch("title");
  const watchedContent = form.watch("content");
  const watchedTags = form.watch("tags");

  // Initialize content manager
  useEffect(() => {
    if (contentRef.current) {
      contentManager.setEditor(contentRef.current);
      contentManager.setOnContentChange((content) => {
        form.setValue("content", content);
        // Update word count
        const textContent = contentRef.current?.textContent || '';
        const words = textContent.trim().split(/\s+/).filter(word => word.length > 0).length;
        setWordCount(words);
      });
      
      // Initialize with empty content
      contentManager.saveToHistory();
    }
  }, [contentManager, form]);

  // Sync content when form content changes (e.g., from other tabs)
  useEffect(() => {
    if (contentRef.current && watchedContent !== contentManager.getContent()) {
      contentManager.setContent(watchedContent);
    }
  }, [watchedContent, contentManager]);

  // Handle title change and generate slug
  const handleTitleChange = (title: string) => {
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    form.setValue("slug", slug);
  };

  // Content change handler
  const handleContentChange = useCallback(() => {
    if (contentRef.current) {
      const content = contentRef.current.innerHTML;
      contentManager.onContentChange(content);
    }
  }, [contentManager]);

  // Rich text formatting functions
  const formatText = (command: 'bold' | 'italic' | 'underline' | 'strikethrough') => {
    contentManager.formatText(command);
  };

  const applyFontFamily = (family: string) => {
    setFontFamily(family);
    contentManager.applyFontFamily(family);
  };

  const applyTextColor = (color: string) => {
    setTextColor(color);
    contentManager.applyTextColor(color);
    setShowColorPicker(false);
  };

  const applyHighlightColor = (color: string) => {
    setHighlightColor(color);
    contentManager.applyHighlightColor(color);
    setShowHighlightPicker(false);
  };

  const insertTable = () => {
    contentManager.insertTable(tableConfig);
    setShowTableModal(false);
  };

  const insertImage = () => {
    const url = prompt('Enter image URL (e.g., https://example.com/image.jpg):');
    if (url) {
      const altText = prompt('Enter alternative text for the image (optional):') || 'Image';
      const width = prompt('Enter image width (optional, e.g., 300px or 50%):') || 'auto';
      contentManager.insertImage(url, altText, width);
    }
  };

  const createList = (ordered: boolean = false) => {
    contentManager.createList(ordered);
  };

  const insertHeading = (level: number) => {
    contentManager.insertHeading(level);
  };

  const insertImageIntoContent = (imageUrl: string) => {
    contentManager.insertImage(imageUrl);
    setShowContentImageUploader(false);
  };

  // Clear content
  const clearContent = () => {
    if (confirm('Are you sure you want to clear all content?')) {
      contentManager.clear();
    }
  };

  // Undo/Redo
  const undo = () => contentManager.undo();
  const redo = () => contentManager.redo();

  // Tag management
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

  // Function to strip HTML tags and extract clean text
  const extractTextFromHTML = (html: string): string => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    return tempDiv.textContent || tempDiv.innerText || '';
  };

  const onSubmit = (data: AdvancedBlogPost) => {
    // Auto-generate excerpt if empty
    if (!data.excerpt && data.content) {
      const cleanText = extractTextFromHTML(data.content);
      data.excerpt = cleanText.slice(0, 150).trim() + (cleanText.length > 150 ? "..." : "");
    }
    
    // Auto-generate meta description if empty
    if (!data.metaDescription && data.excerpt) {
      data.metaDescription = data.excerpt;
    }

    onSave(data);
  };

  // Preview toggle with content sync
  const togglePreview = () => {
    if (!previewMode) {
      // Switching to preview mode - sync content first
      if (contentRef.current) {
        const currentContent = contentRef.current.innerHTML;
        if (currentContent !== form.getValues("content")) {
          form.setValue("content", currentContent);
        }
      }
    }
    setPreviewMode(!previewMode);
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
              onClick={togglePreview}
              className="flex items-center gap-2"
              data-testid="button-preview"
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
            title={watchedTitle || "Untitled Post"}
            content={watchedContent || "No content available"}
            tags={watchedTags || []}
            readTime={form.watch("readTime") || 5}
            author={form.watch("author") || "OfficeXpress Team"}
          />
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Tabs 
                defaultValue="content" 
                className="w-full"
                onValueChange={(value) => {
                  // Always sync content when switching tabs to prevent data loss
                  if (contentRef.current) {
                    const currentContent = contentRef.current.innerHTML;
                    if (currentContent && currentContent !== form.getValues("content")) {
                      form.setValue("content", currentContent);
                    }
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

                  {/* Rich Text Editor */}
                  <FormField
                    control={form.control}
                    name="content"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex justify-between items-center">
                          <FormLabel>Content *</FormLabel>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={clearContent}
                              className="h-6 px-2 text-xs"
                            >
                              <RotateCcw className="h-3 w-3 mr-1" />
                              Clear
                            </Button>
                            <span>{wordCount} words • {Math.ceil(wordCount / 200)} min read</span>
                          </div>
                        </div>
                        
                        <div className="border rounded-lg">
                          {/* Rich Text Toolbar */}
                          <div className="border-b p-3 bg-gray-50 space-y-2">
                            {/* First Row - Basic Formatting */}
                            <div className="flex items-center gap-1 flex-wrap">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={undo}
                                className="h-8 w-8 p-0"
                                title="Undo"
                              >
                                <Undo className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={redo}
                                className="h-8 w-8 p-0"
                                title="Redo"
                              >
                                <Redo className="h-4 w-4" />
                              </Button>
                              
                              <Separator orientation="vertical" className="h-6 mx-1" />
                              
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => formatText('bold')}
                                className="h-8 w-8 p-0"
                                title="Bold"
                              >
                                <Bold className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => formatText('italic')}
                                className="h-8 w-8 p-0"
                                title="Italic"
                              >
                                <Italic className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => formatText('underline')}
                                className="h-8 w-8 p-0"
                                title="Underline"
                              >
                                <Underline className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => formatText('strikethrough')}
                                className="h-8 w-8 p-0"
                                title="Strikethrough"
                              >
                                <Strikethrough className="h-4 w-4" />
                              </Button>

                              <Separator orientation="vertical" className="h-6 mx-1" />

                              {/* Font Family */}
                              <div className="relative">
                                <Select value={fontFamily} onValueChange={applyFontFamily}>
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
                                  </SelectContent>
                                </Select>
                              </div>

                              {/* Text Color */}
                              <div className="relative">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setShowColorPicker(!showColorPicker)}
                                  className="h-8 w-8 p-0"
                                  title="Text Color"
                                >
                                  <Type className="h-4 w-4" style={{ color: textColor }} />
                                </Button>
                                {showColorPicker && (
                                  <div className="absolute top-10 left-0 z-50 p-3 bg-white border rounded-lg shadow-lg">
                                    <div className="grid grid-cols-6 gap-2 mb-3">
                                      {[
                                        '#000000', '#333333', '#666666', '#999999', '#cccccc', '#ffffff',
                                        '#ff0000', '#ff8800', '#ffff00', '#88ff00', '#00ff00', '#00ff88',
                                        '#00ffff', '#0088ff', '#0000ff', '#8800ff', '#ff00ff', '#ff0088'
                                      ].map(color => (
                                        <button
                                          key={color}
                                          type="button"
                                          className="w-6 h-6 rounded border border-gray-300 hover:scale-110 transition-transform"
                                          style={{ backgroundColor: color }}
                                          onClick={() => applyTextColor(color)}
                                        />
                                      ))}
                                    </div>
                                    <input
                                      type="color"
                                      value={textColor}
                                      onChange={(e) => applyTextColor(e.target.value)}
                                      className="w-full h-8 rounded border"
                                    />
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setShowColorPicker(false)}
                                      className="w-full mt-2 h-6 text-xs"
                                    >
                                      Close
                                    </Button>
                                  </div>
                                )}
                              </div>

                              {/* Highlight Color */}
                              <div className="relative">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setShowHighlightPicker(!showHighlightPicker)}
                                  className="h-8 w-8 p-0"
                                  title="Highlight Color"
                                >
                                  <Highlighter className="h-4 w-4" style={{ color: highlightColor }} />
                                </Button>
                                {showHighlightPicker && (
                                  <div className="absolute top-10 left-0 z-50 p-3 bg-white border rounded-lg shadow-lg">
                                    <div className="grid grid-cols-6 gap-2 mb-3">
                                      {[
                                        '#ffff00', '#ff8800', '#ff0088', '#8800ff', '#0088ff', '#00ff88',
                                        '#ffcccc', '#ffffcc', '#ccffcc', '#ccffff', '#ccccff', '#ffccff'
                                      ].map(color => (
                                        <button
                                          key={color}
                                          type="button"
                                          className="w-6 h-6 rounded border border-gray-300 hover:scale-110 transition-transform"
                                          style={{ backgroundColor: color }}
                                          onClick={() => applyHighlightColor(color)}
                                        />
                                      ))}
                                    </div>
                                    <input
                                      type="color"
                                      value={highlightColor}
                                      onChange={(e) => applyHighlightColor(e.target.value)}
                                      className="w-full h-8 rounded border"
                                    />
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setShowHighlightPicker(false)}
                                      className="w-full mt-2 h-6 text-xs"
                                    >
                                      Close
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Second Row - Lists and Insertions */}
                            <div className="flex items-center gap-1 flex-wrap">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => createList(false)}
                                className="h-8 w-8 p-0"
                                title="Bullet List"
                              >
                                <List className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => createList(true)}
                                className="h-8 w-8 p-0"
                                title="Numbered List"
                              >
                                <ListOrdered className="h-4 w-4" />
                              </Button>

                              <Separator orientation="vertical" className="h-6 mx-1" />

                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => insertHeading(1)}
                                className="h-8 px-2 text-xs font-semibold"
                                title="Heading 1"
                              >
                                H1
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => insertHeading(2)}
                                className="h-8 px-2 text-xs font-semibold"
                                title="Heading 2"
                              >
                                H2
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => insertHeading(3)}
                                className="h-8 px-2 text-xs font-semibold"
                                title="Heading 3"
                              >
                                H3
                              </Button>

                              <Separator orientation="vertical" className="h-6 mx-1" />

                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowTableModal(true)}
                                className="h-8 w-8 p-0"
                                title="Insert Table"
                              >
                                <Table className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={insertImage}
                                className="h-8 w-8 p-0"
                                title="Insert Image"
                              >
                                <Image className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          
                          {/* Rich Text Editor */}
                          <FormControl>
                            <div
                              ref={contentRef}
                              contentEditable
                              onInput={handleContentChange}
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
                              className="min-h-[400px] border-0 rounded-b-lg p-4 focus:outline-none focus:ring-2 focus:ring-ring bg-white prose max-w-none"
                              style={{ 
                                maxHeight: '600px', 
                                overflowY: 'auto'
                              }}
                              data-testid="rich-text-editor"
                              suppressContentEditableWarning={true}
                            />
                          </FormControl>
                        </div>

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
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>

                {/* SEO & Meta Tab */}
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
                                placeholder="Brief description for search engines (150-160 characters)"
                                className="h-24"
                                data-testid="textarea-meta-description"
                              />
                            </FormControl>
                            <div className="text-sm text-muted-foreground">
                              {field.value?.length || 0}/160 characters
                            </div>
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
                                placeholder="keyword1, keyword2, keyword3"
                                data-testid="input-meta-keywords"
                              />
                            </FormControl>
                            <div className="text-sm text-muted-foreground">
                              Comma-separated keywords for SEO
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="excerpt"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Excerpt</FormLabel>
                            <FormControl>
                              <Textarea 
                                {...field} 
                                placeholder="Short excerpt for blog listings"
                                className="h-24"
                                data-testid="textarea-excerpt"
                              />
                            </FormControl>
                            <div className="text-sm text-muted-foreground">
                              Brief summary for blog cards and previews
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="featuredImage"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Featured Image URL</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                value={field.value || ""}
                                placeholder="https://example.com/featured-image.jpg"
                                data-testid="input-featured-image"
                              />
                            </FormControl>
                            <div className="text-sm text-muted-foreground">
                              Image for social media sharing and blog cards
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </TabsContent>

                {/* Settings Tab */}
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
                                <SelectItem value="Industry News">Industry News</SelectItem>
                                <SelectItem value="Safety Tips">Safety Tips</SelectItem>
                                <SelectItem value="Travel Guide">Travel Guide</SelectItem>
                                <SelectItem value="Company Updates">Company Updates</SelectItem>
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

                      <FormField
                        control={form.control}
                        name="readTime"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Read Time (minutes)</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                type="number"
                                min="1"
                                max="60"
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 5)}
                                data-testid="input-read-time"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="space-y-4">
                      <div>
                        <Label className="text-base font-medium">Tags</Label>
                        <div className="flex gap-2 mt-2">
                          <Input
                            value={newTag}
                            onChange={(e) => setNewTag(e.target.value)}
                            placeholder="Add tag"
                            className="flex-1"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                addTag();
                              }
                            }}
                            data-testid="input-new-tag"
                          />
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={addTag}
                            data-testid="button-add-tag"
                          >
                            Add
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-3">
                          {watchedTags.map((tag, index) => (
                            <Badge key={index} variant="secondary" className="flex items-center gap-1">
                              {tag}
                              <button
                                type="button"
                                onClick={() => removeTag(tag)}
                                className="ml-1 hover:bg-gray-300 rounded-full w-4 h-4 flex items-center justify-center text-xs"
                                data-testid={`button-remove-tag-${index}`}
                              >
                                ×
                              </button>
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Publishing Tab */}
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
                                Make this post visible to the public
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

                    </div>

                    <div className="space-y-4">
                      <Card>
                        <CardContent className="p-4">
                          <h4 className="font-medium mb-2">Publishing Status</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span>Status:</span>
                              <span className={form.watch("published") ? "text-green-600" : "text-gray-600"}>
                                {form.watch("published") ? "Published" : "Draft"}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Word Count:</span>
                              <span>{wordCount} words</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Read Time:</span>
                              <span>{form.watch("readTime")} min</span>
                            </div>
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
                  className="flex items-center gap-2"
                  data-testid="button-save-draft"
                >
                  <Save className="h-4 w-4" />
                  {isLoading ? "Saving..." : "Save as Draft"}
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

      {/* Table Creation Modal */}
      <Dialog open={showTableModal} onOpenChange={setShowTableModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Insert Table</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Rows</Label>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={tableConfig.rows}
                  onChange={(e) => setTableConfig(prev => ({...prev, rows: parseInt(e.target.value) || 3}))}
                />
              </div>
              <div>
                <Label>Columns</Label>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={tableConfig.cols}
                  onChange={(e) => setTableConfig(prev => ({...prev, cols: parseInt(e.target.value) || 3}))}
                />
              </div>
            </div>
            
            <div>
              <Label>Header Background Color</Label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={tableConfig.headerBg}
                  onChange={(e) => setTableConfig(prev => ({...prev, headerBg: e.target.value}))}
                  className="w-12 h-8 rounded border"
                />
                <span className="text-sm text-gray-600">{tableConfig.headerBg}</span>
              </div>
            </div>
            
            <div>
              <Label>Cell Background Color</Label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={tableConfig.cellBg}
                  onChange={(e) => setTableConfig(prev => ({...prev, cellBg: e.target.value}))}
                  className="w-12 h-8 rounded border"
                />
                <span className="text-sm text-gray-600">{tableConfig.cellBg}</span>
              </div>
            </div>
            
            <div>
              <Label>Border Color</Label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={tableConfig.borderColor}
                  onChange={(e) => setTableConfig(prev => ({...prev, borderColor: e.target.value}))}
                  className="w-12 h-8 rounded border"
                />
                <span className="text-sm text-gray-600">{tableConfig.borderColor}</span>
              </div>
            </div>
            
            <div>
              <Label>Header Text Color</Label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={tableConfig.headerTextColor}
                  onChange={(e) => setTableConfig(prev => ({...prev, headerTextColor: e.target.value}))}
                  className="w-12 h-8 rounded border"
                />
                <span className="text-sm text-gray-600">{tableConfig.headerTextColor}</span>
              </div>
            </div>
            
            <div>
              <Label>Cell Text Color</Label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={tableConfig.cellTextColor}
                  onChange={(e) => setTableConfig(prev => ({...prev, cellTextColor: e.target.value}))}
                  className="w-12 h-8 rounded border"
                />
                <span className="text-sm text-gray-600">{tableConfig.cellTextColor}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTableModal(false)}>Cancel</Button>
            <Button onClick={insertTable}>Insert Table</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
        
        {content ? (
          <div 
            className="prose max-w-none"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        ) : (
          <div className="text-muted-foreground">
            Start writing your content...
          </div>
        )}
      </article>
    </div>
  );
}