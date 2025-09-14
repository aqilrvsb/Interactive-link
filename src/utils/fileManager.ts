import { toast } from 'sonner';

export interface ProjectFile {
  id: string;
  title: string;
  content: string;
}

export class FileManager {
  private static getFileName(projectId: string): string {
    return `${projectId}.html`;
  }

  private static getFilePath(projectId: string): string {
    return `public/${this.getFileName(projectId)}`;
  }

  static async createProjectFile(projectId: string, title: string, content: string): Promise<boolean> {
    try {
      const fileName = this.getFileName(projectId);
      const filePath = this.getFilePath(projectId);

      // Create the HTML content with proper structure
      const htmlContent = this.processHtmlContent(content, title);

      // Store file data in localStorage for preview functionality
      localStorage.setItem(`project_file_${projectId}`, JSON.stringify({
        id: projectId,
        title,
        content: htmlContent,
        fileName,
        filePath,
        createdAt: new Date().toISOString()
      }));

      // For Railway deployment, create a downloadable file that can be manually placed
      // This creates a download link for the user to save the file
      this.createDownloadableFile(fileName, htmlContent);
      
      return true;
    } catch (error) {
      console.error('Error creating project file:', error);
      return false;
    }
  }

  static async updateProjectFile(projectId: string, title: string, content: string): Promise<boolean> {
    try {
      const existingData = localStorage.getItem(`project_file_${projectId}`);
      if (!existingData) {
        return this.createProjectFile(projectId, title, content);
      }

      const fileData = JSON.parse(existingData);
      const htmlContent = this.processHtmlContent(content, title);

      const updatedData = {
        ...fileData,
        title,
        content: htmlContent,
        updatedAt: new Date().toISOString()
      };

      localStorage.setItem(`project_file_${projectId}`, JSON.stringify(updatedData));
      
      console.log(`File updated at: ${fileData.filePath}`);
      console.log(`Content length: ${htmlContent.length} characters`);
      
      return true;
    } catch (error) {
      console.error('Error updating project file:', error);
      return false;
    }
  }

  static async deleteProjectFile(projectId: string): Promise<boolean> {
    try {
      const existingData = localStorage.getItem(`project_file_${projectId}`);
      if (existingData) {
        const fileData = JSON.parse(existingData);
        console.log(`File should be deleted from: ${fileData.filePath}`);
      }

      localStorage.removeItem(`project_file_${projectId}`);
      return true;
    } catch (error) {
      console.error('Error deleting project file:', error);
      return false;
    }
  }

  static getProjectFile(projectId: string): ProjectFile | null {
    try {
      const data = localStorage.getItem(`project_file_${projectId}`);
      if (!data) return null;
      
      const fileData = JSON.parse(data);
      return {
        id: fileData.id,
        title: fileData.title,
        content: fileData.content
      };
    } catch (error) {
      console.error('Error getting project file:', error);
      return null;
    }
  }

  static getProjectFileUrl(projectId: string): string {
    const fileName = this.getFileName(projectId);
    // For Railway.app, files in public folder are served directly
    return `/${fileName}`;
  }

  static openPreview(projectId: string): void {
    // Get the stored file content
    const fileData = this.getProjectFile(projectId);
    if (!fileData) {
      toast.error('No file found for this project. Please save first.');
      return;
    }

    // Create a blob URL from the stored content for preview
    const blob = new Blob([fileData.content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    const previewWindow = window.open(url, '_blank', 'toolbar=yes,scrollbars=yes,resizable=yes,width=1200,height=800');
    
    if (previewWindow) {
      toast.success('Preview opened in new tab');
      // Clean up the blob URL after a short delay
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } else {
      toast.error('Please allow pop-ups to open preview');
    }
  }

  private static processHtmlContent(content: string, title: string): string {
    // If content is already a complete HTML document, return as-is
    if (content.toLowerCase().includes('<!doctype') || content.toLowerCase().includes('<html')) {
      return content;
    }

    // Otherwise, wrap in basic HTML structure
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
</head>
<body>
${content}
</body>
</html>`;
  }

  private static createDownloadableFile(fileName: string, content: string): void {
    // Create a downloadable file for manual deployment to Railway
    console.log(`To deploy to Railway, create file: public/${fileName}`);
    console.log('File content ready for download/copy');
    
    // Optionally create download link (commented out to avoid automatic downloads)
    // const blob = new Blob([content], { type: 'text/html' });
    // const url = URL.createObjectURL(blob);
    // const a = document.createElement('a');
    // a.href = url;
    // a.download = fileName;
    // a.click();
    // URL.revokeObjectURL(url);
  }

  static listAllProjectFiles(): Array<{id: string, title: string, fileName: string, filePath: string, createdAt: string}> {
    const files = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('project_file_')) {
        try {
          const data = JSON.parse(localStorage.getItem(key) || '');
          files.push({
            id: data.id,
            title: data.title,
            fileName: data.fileName,
            filePath: data.filePath,
            createdAt: data.createdAt
          });
        } catch (e) {
          console.error('Error parsing file data:', e);
        }
      }
    }
    return files.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
}
