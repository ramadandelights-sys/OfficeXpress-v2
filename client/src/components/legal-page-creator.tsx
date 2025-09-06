import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, Save, Scale, Edit, Bold, Italic, Underline, List, ListOrdered, Link, Type, AlignLeft, AlignCenter, AlignRight, Strikethrough, Quote, Code, Table, Minus, Undo, Redo, Palette, Highlighter, Plus, CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { insertLegalPageSchema, updateLegalPageSchema } from "@shared/schema";
import { z } from "zod";
import type { LegalPage } from "@shared/schema";

type LegalPageFormData = z.infer<typeof insertLegalPageSchema>;

interface LegalPageCreatorProps {
  onSave: (data: LegalPageFormData) => void;
  isLoading: boolean;
  onCancel?: () => void;
  initialData?: LegalPage;
}

export default function LegalPageCreator({ onSave, isLoading, onCancel, initialData }: LegalPageCreatorProps) {
  const { toast } = useToast();
  const [previewMode, setPreviewMode] = useState(false);
  const [isRichTextMode, setIsRichTextMode] = useState(true);
  const contentRef = useRef<HTMLDivElement>(null);
  const [fontSize, setFontSize] = useState(14);
  const [textColor, setTextColor] = useState('#000000');
  const [highlightColor, setHighlightColor] = useState('#ffff00');

  const form = useForm<LegalPageFormData>({
    resolver: zodResolver(initialData ? updateLegalPageSchema : insertLegalPageSchema),
    defaultValues: {
      type: initialData?.type || "terms",
      title: initialData?.title || "",
      content: initialData?.content || "",
    },
  });

  const formatCommand = (command: string, value?: string) => {
    if (!contentRef.current) return;
    
    document.execCommand(command, false, value);
    updateContentFromEditor();
  };

  const updateContentFromEditor = () => {
    if (contentRef.current) {
      const content = contentRef.current.innerHTML;
      form.setValue("content", content);
    }
  };

  const insertElement = (element: string) => {
    if (!contentRef.current) return;
    
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      range.insertNode(document.createTextNode(element));
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    }
    updateContentFromEditor();
  };

  const onSubmit = (data: LegalPageFormData) => {
    if (isRichTextMode && contentRef.current) {
      data.content = contentRef.current.innerHTML;
    }
    onSave(data);
  };

  const watchedContent = form.watch("content");

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Scale className="h-5 w-5" />
          {initialData ? "Edit Legal Page" : "Create Legal Page"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Page Type */}
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Page Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-legal-type">
                          <SelectValue placeholder="Select page type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="terms">Terms & Conditions</SelectItem>
                        <SelectItem value="privacy">Privacy Policy</SelectItem>
                        <SelectItem value="refund">Refund Policy</SelectItem>
                        <SelectItem value="cookie">Cookie Policy</SelectItem>
                        <SelectItem value="disclaimer">Disclaimer</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Title */}
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., Terms and Conditions" 
                        {...field} 
                        data-testid="input-legal-title"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Content Editor */}
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Content</FormLabel>
                  <div className="border rounded-lg">
                    <Tabs value={isRichTextMode ? "rich" : "markdown"} onValueChange={(value) => setIsRichTextMode(value === "rich")}>
                      <div className="flex items-center justify-between px-3 py-2 border-b">
                        <TabsList className="h-8">
                          <TabsTrigger value="rich" className="text-xs">Rich Text</TabsTrigger>
                          <TabsTrigger value="markdown" className="text-xs">HTML</TabsTrigger>
                        </TabsList>
                        <div className="flex items-center gap-1">
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setPreviewMode(!previewMode)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <TabsContent value="rich" className="m-0">
                        {isRichTextMode && (
                          <div className="flex flex-wrap gap-1 p-2 border-b bg-gray-50 dark:bg-gray-800">
                            {/* Formatting Buttons */}
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => formatCommand('bold')}
                              className="h-8 w-8 p-0"
                            >
                              <Bold className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => formatCommand('italic')}
                              className="h-8 w-8 p-0"
                            >
                              <Italic className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => formatCommand('underline')}
                              className="h-8 w-8 p-0"
                            >
                              <Underline className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => formatCommand('strikeThrough')}
                              className="h-8 w-8 p-0"
                            >
                              <Strikethrough className="h-4 w-4" />
                            </Button>
                            
                            <div className="w-px h-6 bg-gray-300 mx-1" />
                            
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => formatCommand('insertUnorderedList')}
                              className="h-8 w-8 p-0"
                            >
                              <List className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => formatCommand('insertOrderedList')}
                              className="h-8 w-8 p-0"
                            >
                              <ListOrdered className="h-4 w-4" />
                            </Button>
                            
                            <div className="w-px h-6 bg-gray-300 mx-1" />
                            
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => formatCommand('justifyLeft')}
                              className="h-8 w-8 p-0"
                            >
                              <AlignLeft className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => formatCommand('justifyCenter')}
                              className="h-8 w-8 p-0"
                            >
                              <AlignCenter className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => formatCommand('justifyRight')}
                              className="h-8 w-8 p-0"
                            >
                              <AlignRight className="h-4 w-4" />
                            </Button>

                            <div className="w-px h-6 bg-gray-300 mx-1" />

                            <Select onValueChange={(value) => formatCommand('formatBlock', value)}>
                              <SelectTrigger className="h-8 w-24">
                                <SelectValue placeholder="Style" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="h1">Heading 1</SelectItem>
                                <SelectItem value="h2">Heading 2</SelectItem>
                                <SelectItem value="h3">Heading 3</SelectItem>
                                <SelectItem value="p">Paragraph</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                        
                        {previewMode ? (
                          <div className="p-4 min-h-[400px] prose max-w-none">
                            <div dangerouslySetInnerHTML={{ __html: watchedContent || "No content to preview" }} />
                          </div>
                        ) : (
                          <div
                            ref={contentRef}
                            contentEditable
                            suppressContentEditableWarning
                            className="p-4 min-h-[400px] focus:outline-none"
                            style={{ fontSize: `${fontSize}px`, color: textColor }}
                            onInput={updateContentFromEditor}
                            dangerouslySetInnerHTML={{ __html: field.value || "" }}
                            data-testid="editor-legal-content"
                          />
                        )}
                      </TabsContent>

                      <TabsContent value="markdown" className="m-0">
                        <Textarea
                          {...field}
                          placeholder="Enter HTML content..."
                          className="min-h-[400px] font-mono text-sm border-0 rounded-none resize-none"
                          data-testid="textarea-legal-html"
                        />
                      </TabsContent>
                    </Tabs>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Action Buttons */}
            <div className="flex justify-end gap-3">
              {onCancel && (
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={onCancel}
                  data-testid="button-cancel-legal"
                >
                  Cancel
                </Button>
              )}
              <Button 
                type="submit" 
                disabled={isLoading}
                className="bg-[#4c9096] hover:bg-[#4c9096]/90 text-white"
                data-testid="button-save-legal"
              >
                <Save className="h-4 w-4 mr-2" />
                {isLoading ? "Saving..." : initialData ? "Update Page" : "Create Page"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}