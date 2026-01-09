
import { Component, input, output, signal, computed, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../ui/icon.component';
import { ChatConfig, ChatMessage } from '../../services/llm.service';

@Component({
  selector: 'app-session-manager',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <div class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      
      <!-- Modal Container -->
      <div class="bg-[#0a0a0a] border border-cyber-border w-full max-w-4xl h-[90vh] md:h-[80vh] flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.8)] relative overflow-hidden">
        
        <!-- Decoration Lines -->
        <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-neon-green via-neon-blue to-neon-purple"></div>
        
        <!-- Header -->
        <div class="p-4 border-b border-cyber-border flex items-center justify-between bg-[#050505]">
          <div class="flex items-center gap-3">
             <div class="p-2 bg-neon-green/10 border border-neon-green/30 text-neon-green">
               <app-icon name="file-code" [size]="20"></app-icon>
             </div>
             <div>
               <h2 class="text-lg font-bold text-white uppercase tracking-widest font-mono">Session Protocol</h2>
               <div class="text-[10px] text-cyber-muted font-mono">EXPORT / IMPORT / CODE GEN</div>
             </div>
          </div>
          <button (click)="close.emit()" class="text-cyber-muted hover:text-white transition-colors p-2">
            <app-icon name="x" [size]="24"></app-icon>
          </button>
        </div>

        <!-- Navigation Tabs -->
        <div class="flex border-b border-cyber-border bg-[#0a0a0a] overflow-x-auto scrollbar-hide">
           <button 
             *ngFor="let tab of tabs" 
             (click)="activeTab.set(tab.id)"
             class="px-6 py-4 text-xs font-bold uppercase tracking-widest transition-all border-b-2 whitespace-nowrap"
             [class.border-neon-green]="activeTab() === tab.id"
             [class.text-neon-green]="activeTab() === tab.id"
             [class.border-transparent]="activeTab() !== tab.id"
             [class.text-cyber-muted]="activeTab() !== tab.id"
             [class.hover:text-white]="activeTab() !== tab.id"
           >
             {{ tab.label }}
           </button>
        </div>

        <!-- Content Area -->
        <div class="flex-1 overflow-hidden relative bg-[#050505] p-0 md:p-6">
           
           <!-- Tab: JSON Session -->
           @if (activeTab() === 'json') {
             <div class="h-full flex flex-col gap-4 animate-in slide-in-from-bottom-2 fade-in duration-300 p-4 md:p-0">
                <div class="flex justify-between items-center">
                   <div class="text-xs text-cyber-muted font-mono">Tam Sessiya (Config + Mesajlar)</div>
                   <div class="flex gap-2">
                     <button (click)="copyToClipboard(getSessionJson())" class="btn-cyber-outline text-xs">
                        <app-icon [name]="copied() ? 'check' : 'clipboard'" [size]="14"></app-icon>
                        {{ copied() ? 'KOPYALANDI' : 'COPY JSON' }}
                     </button>
                     <button (click)="downloadJson()" class="btn-cyber-solid text-xs">
                        <app-icon name="download" [size]="14"></app-icon>
                        DOWNLOAD .JSON
                     </button>
                   </div>
                </div>
                <div class="flex-1 border border-cyber-border bg-[#0a0a0a] relative group overflow-hidden">
                   <textarea readonly class="w-full h-full bg-transparent p-4 font-mono text-xs text-neon-blue resize-none focus:outline-none custom-scrollbar">{{ getSessionJson() }}</textarea>
                </div>
             </div>
           }

           <!-- Tab: Python -->
           @if (activeTab() === 'python') {
             <div class="h-full flex flex-col gap-4 animate-in slide-in-from-bottom-2 fade-in duration-300 p-4 md:p-0">
                <div class="flex justify-between items-center">
                   <div class="text-xs text-cyber-muted font-mono">Python (requests)</div>
                   <button (click)="copyToClipboard(generatePython())" class="btn-cyber-outline text-xs">
                      <app-icon [name]="copied() ? 'check' : 'clipboard'" [size]="14"></app-icon>
                      COPY PYTHON
                   </button>
                </div>
                <div class="flex-1 border border-cyber-border bg-[#0a0a0a] relative overflow-hidden">
                   <textarea readonly class="w-full h-full bg-transparent p-4 font-mono text-xs text-neon-purple resize-none focus:outline-none custom-scrollbar">{{ generatePython() }}</textarea>
                </div>
             </div>
           }

           <!-- Tab: JavaScript -->
           @if (activeTab() === 'js') {
             <div class="h-full flex flex-col gap-4 animate-in slide-in-from-bottom-2 fade-in duration-300 p-4 md:p-0">
                <div class="flex justify-between items-center">
                   <div class="text-xs text-cyber-muted font-mono">Node.js (fetch)</div>
                   <button (click)="copyToClipboard(generateJs())" class="btn-cyber-outline text-xs">
                      <app-icon [name]="copied() ? 'check' : 'clipboard'" [size]="14"></app-icon>
                      COPY JS
                   </button>
                </div>
                <div class="flex-1 border border-cyber-border bg-[#0a0a0a] relative overflow-hidden">
                   <textarea readonly class="w-full h-full bg-transparent p-4 font-mono text-xs text-neon-orange resize-none focus:outline-none custom-scrollbar">{{ generateJs() }}</textarea>
                </div>
             </div>
           }

           <!-- Tab: cURL -->
           @if (activeTab() === 'curl') {
             <div class="h-full flex flex-col gap-4 animate-in slide-in-from-bottom-2 fade-in duration-300 p-4 md:p-0">
                <div class="flex justify-between items-center">
                   <div class="text-xs text-cyber-muted font-mono">Terminal (cURL)</div>
                   <button (click)="copyToClipboard(generateCurl())" class="btn-cyber-outline text-xs">
                      <app-icon [name]="copied() ? 'check' : 'clipboard'" [size]="14"></app-icon>
                      COPY CURL
                   </button>
                </div>
                <div class="flex-1 border border-cyber-border bg-[#0a0a0a] relative overflow-hidden">
                   <textarea readonly class="w-full h-full bg-transparent p-4 font-mono text-xs text-gray-300 resize-none focus:outline-none custom-scrollbar">{{ generateCurl() }}</textarea>
                </div>
             </div>
           }

           <!-- Tab: Import -->
           @if (activeTab() === 'import') {
             <div class="h-full flex flex-col gap-6 animate-in slide-in-from-bottom-2 fade-in duration-300 p-4 md:p-0">
                
                <!-- File Import -->
                <div class="p-6 border border-dashed border-cyber-border hover:border-neon-green/50 bg-[#0a0a0a] flex flex-col items-center justify-center gap-4 transition-all group cursor-pointer" (click)="fileInput.click()">
                   <div class="p-4 bg-cyber-black rounded-full group-hover:bg-neon-green/10 transition-colors">
                     <app-icon name="upload" [size]="24" class="text-cyber-muted group-hover:text-neon-green"></app-icon>
                   </div>
                   <div class="text-center">
                     <div class="text-sm font-bold text-white mb-1">JSON FAYLI YÜKLƏ</div>
                     <div class="text-[10px] text-cyber-muted">Kliklə və ya faylı bura atın</div>
                   </div>
                   <input #fileInput type="file" class="hidden" accept=".json" (change)="handleFile($event)">
                </div>

                <div class="flex items-center gap-4">
                  <div class="h-px bg-cyber-border flex-1"></div>
                  <span class="text-[10px] text-cyber-muted font-mono">OR PASTE CODE</span>
                  <div class="h-px bg-cyber-border flex-1"></div>
                </div>

                <!-- Text Import -->
                <div class="flex-1 flex flex-col gap-2">
                   <textarea 
                     [(ngModel)]="importText"
                     placeholder="Sessiya JSON kodunu bura yapışdırın..."
                     class="w-full flex-1 bg-[#0a0a0a] border border-cyber-border p-4 font-mono text-xs text-white placeholder-cyber-muted focus:border-neon-green focus:outline-none custom-scrollbar resize-none"
                   ></textarea>
                   <button (click)="processImportText()" [disabled]="!importText" class="btn-cyber-solid w-full justify-center">
                     <app-icon name="refresh-cw" [size]="16"></app-icon>
                     SESSİYANI BƏRPA ET
                   </button>
                </div>
             </div>
           }
        </div>

      </div>
    </div>
  `,
  styles: [`
    .btn-cyber-outline {
      @apply flex items-center gap-2 px-4 py-2 border border-cyber-border text-cyber-text hover:border-neon-green hover:text-neon-green bg-transparent transition-all uppercase font-bold tracking-wider;
    }
    .btn-cyber-solid {
      @apply flex items-center gap-2 px-4 py-2 bg-neon-green text-black font-bold hover:bg-[#00cc33] transition-all uppercase tracking-wider;
    }
    .btn-cyber-solid:disabled {
      @apply opacity-50 cursor-not-allowed bg-cyber-border text-cyber-muted;
    }
    /* Hide scrollbar for tabs */
    .scrollbar-hide::-webkit-scrollbar {
        display: none;
    }
    .scrollbar-hide {
        -ms-overflow-style: none;
        scrollbar-width: none;
    }
  `]
})
export class SessionManagerComponent {
  config = input.required<ChatConfig>();
  messages = input.required<ChatMessage[]>();
  
  close = output<void>();
  importData = output<{config?: ChatConfig, messages?: ChatMessage[]}>();

  activeTab = signal<'json' | 'python' | 'js' | 'curl' | 'import'>('json');
  copied = signal(false);
  importText = '';

  tabs = [
    { id: 'json', label: 'SESSION JSON' },
    { id: 'python', label: 'PYTHON' },
    { id: 'js', label: 'NODE.JS' },
    { id: 'curl', label: 'CURL' },
    { id: 'import', label: 'IMPORT' }
  ];

  getSessionJson(): string {
    const data = {
      config: this.config(),
      messages: this.messages(),
      timestamp: new Date().toISOString(),
      client: 'PierringShot v2.1'
    };
    return JSON.stringify(data, null, 2);
  }

  generatePython(): string {
    const c = this.config();
    const cleanMsgs = this.messages().map(m => ({ role: m.role, content: m.content }));
    
    return `import requests
import json

url = "${c.baseUrl}/chat/completions"

headers = {
    "Content-Type": "application/json",
    "Authorization": "Bearer ${c.apiKey}"
}

payload = {
    "model": "${c.model}",
    "messages": ${JSON.stringify(cleanMsgs, null, 4)},
    "temperature": ${c.temperature},
    "max_tokens": ${c.maxTokens},
    "top_p": ${c.topP},
    "stream": False
}

try:
    response = requests.post(url, headers=headers, json=payload)
    response.raise_for_status()
    print(response.json())
except requests.exceptions.RequestException as e:
    print(f"Error: {e}")
`;
  }

  generateJs(): string {
    const c = this.config();
    const cleanMsgs = this.messages().map(m => ({ role: m.role, content: m.content }));

    return `const fetch = require('node-fetch'); // Or native fetch in Node 18+

const url = "${c.baseUrl}/chat/completions";
const apiKey = "${c.apiKey}";

const payload = {
  model: "${c.model}",
  messages: ${JSON.stringify(cleanMsgs, null, 2)},
  temperature: ${c.temperature},
  max_tokens: ${c.maxTokens},
  top_p: ${c.topP},
  stream: false
};

async function runChat() {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': \`Bearer \${apiKey}\`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) throw new Error(\`HTTP error! status: \${response.status}\`);
    
    const data = await response.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

runChat();`;
  }

  generateCurl(): string {
    const c = this.config();
    const cleanMsgs = this.messages().map(m => ({ role: m.role, content: m.content }));
    // Basic escaping for shell
    const jsonBody = JSON.stringify({
        model: c.model,
        messages: cleanMsgs,
        temperature: c.temperature,
        max_tokens: c.maxTokens
    }).replace(/'/g, "'\\''");

    return `curl "${c.baseUrl}/chat/completions" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${c.apiKey}" \\
  -d '${jsonBody}'`;
  }

  copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    });
  }

  downloadJson() {
    const blob = new Blob([this.getSessionJson()], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pierringshot_session_${Date.now()}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  handleFile(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
        this.processJsonString(e.target?.result as string);
    };
    reader.readAsText(file);
    input.value = '';
  }

  processImportText() {
    this.processJsonString(this.importText);
  }

  private processJsonString(jsonStr: string) {
    try {
        const data = JSON.parse(jsonStr);
        this.importData.emit(data);
        this.close.emit();
    } catch (e) {
        alert('Invalid JSON format');
    }
  }
}
