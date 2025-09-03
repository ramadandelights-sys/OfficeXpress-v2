import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Calendar, Eye, Save, Send, Tag, Image, Clock, Search, Edit } from "lucide-react";
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
              <Tabs defaultValue="content" className="w-full">
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
                              onClick={() => setShowContentImageUploader(!showContentImageUploader)}
                              className="flex items-center gap-1"
                            >
                              <Image className="h-3 w-3" />
                              Insert Image
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
                        <FormControl>
                          <Textarea 
                            {...field}
                            onChange={(e) => {
                              field.onChange(e);
                              handleContentChange(e.target.value);
                            }}
                            className="min-h-[400px] font-mono"
                            placeholder="Write your blog post content here... Use Markdown for formatting.

You can also click 'Insert Image' to add images to your content."
                            data-testid="input-blog-content"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

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
                  className="flex items-center gap-2"
                  data-testid="button-save-draft"
                >
                  <Save className="h-4 w-4" />
                  Save as Draft
                </Button>
                <Button 
                  type="submit"
                  disabled={isLoading}
                  onClick={() => form.setValue("published", true)}
                  className="flex items-center gap-2 bg-[#4c9096] hover:bg-[#4c9096]/90"
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
        
        <div className="whitespace-pre-wrap">
          {content || "Start writing your content..."}
        </div>
      </article>
    </div>
  );
}