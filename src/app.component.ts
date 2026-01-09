
import { Component, signal, effect, inject, HostListener, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { ChatComponent } from './components/chat/chat.component';
import { OutputComponent } from './components/output/output.component';
import { SessionManagerComponent } from './components/session-manager/session-manager.component';
import { IconComponent } from './ui/icon.component';
import { LlmService, ChatConfig, ChatMessage, CompletionResponse } from './services/llm.service';

const DEFAULT_CONFIG: ChatConfig = {
  baseUrl: 'https://api.typegpt.net/v1',
  apiKey: 'sk-AQ7hKnlCNU1ZF7jELuUjYt5jqN2vFSPetXwxNfOpKwdIqpeu',
  model: 'openai/gpt-oss-120b',
  temperature: 0.7,
  maxTokens: 4096,
  topP: 1.0,
  tools: []
};

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, SidebarComponent, ChatComponent, OutputComponent, IconComponent, SessionManagerComponent],
  template: `
    <main class="flex flex-col md:flex-row w-full bg-[#050505] overflow-hidden text-[#e0e0e0] font-sans relative h-screen">
      
      <!-- Session Manager Modal -->
      @if (showSessionManager()) {
        <app-session-manager
          [config]="config()"
          [messages]="messages()"
          (close)="showSessionManager.set(false)"
          (importData)="handleImport($event)"
        ></app-session-manager>
      }

      <!-- Mobile Header -->
      <header class="md:hidden h-14 bg-[#0a0a0a] border-b border-[#333] flex items-center justify-between px-4 z-50 flex-shrink-0 shadow-md">
        <div class="flex items-center gap-2">
           <app-icon name="terminal" [size]="16" class="text-neon-green"></app-icon>
           <span class="font-bold tracking-widest text-cyber-text text-xs">PIERRINGSHOT</span>
        </div>
        <button (click)="mobileSidebarOpen.set(true)" class="text-cyber-muted hover:text-white p-1">
           <app-icon name="settings" [size]="20"></app-icon>
        </button>
      </header>

      <!-- Sidebar (Desktop & Mobile Drawer) -->
      <aside class="absolute inset-y-0 left-0 z-50 bg-[#0a0a0a] border-r border-[#333] transition-transform duration-300 md:relative md:translate-x-0 w-[85vw] max-w-[320px] md:w-auto"
             [class.translate-x-0]="mobileSidebarOpen()"
             [class.-translate-x-full]="!mobileSidebarOpen()"
             [class.md:w-80]="!sidebarCollapsed()"
             [class.md:w-[60px]]="sidebarCollapsed()">
        <app-sidebar 
            [(config)]="config" 
            [collapsed]="sidebarCollapsed() && !isMobile()" 
            (toggleCollapse)="toggleSidebar()"
            (closeMobile)="mobileSidebarOpen.set(false)"
            (openSessionManager)="showSessionManager.set(true)"
            (resetToDefaults)="resetState()"
        ></app-sidebar>
        
        <!-- Mobile Close Button -->
        <button class="md:hidden absolute top-4 right-4 text-white p-2 bg-black/50 rounded-full backdrop-blur-sm border border-white/10" (click)="mobileSidebarOpen.set(false)">
            <app-icon name="x" [size]="18"></app-icon>
        </button>
      </aside>

      <!-- Overlay for mobile sidebar -->
      @if (mobileSidebarOpen()) {
        <div class="fixed inset-0 bg-black/80 z-40 md:hidden backdrop-blur-sm" (click)="mobileSidebarOpen.set(false)"></div>
      }

      <!-- Main Content -->
      <div class="flex-1 flex flex-col min-w-0 relative h-full md:flex-row">
         
         <!-- Chat Section -->
         <section class="flex-1 flex flex-col min-w-0 bg-[#050505] h-full relative"
                  [class.hidden]="isMobile() && activeTab() !== 'chat'"
                  [class.flex]="!isMobile() || activeTab() === 'chat'">
            <app-chat 
                [(messages)]="messages" 
                [loading]="isLoading()"
                [hasActiveTools]="config().tools.length > 0"
                (runRequest)="handleRunRequest()"
            ></app-chat>
         </section>

         <!-- Output Section -->
         <aside class="md:w-[450px] flex-col bg-[#050505] border-l border-[#333] h-full z-30"
                [class.hidden]="isMobile() && activeTab() !== 'output'"
                [class.flex]="!isMobile() || activeTab() === 'output'"
                [class.w-full]="isMobile()">
            <app-output 
                [data]="response()" 
                [loading]="isLoading()" 
                [error]="error()" 
                [latency]="latency()"
                [startTime]="startTime()"
                [config]="config()"
            ></app-output>
         </aside>

         <!-- Mobile Bottom Nav -->
         <div class="md:hidden h-14 bg-[#0a0a0a] border-t border-[#333] flex items-center justify-around z-40 flex-shrink-0 pb-safe">
            <button (click)="activeTab.set('chat')" class="flex flex-col items-center gap-1 p-2 transition-colors w-1/2" [class.text-neon-green]="activeTab() === 'chat'" [class.text-gray-500]="activeTab() !== 'chat'">
                <app-icon name="message-square" [size]="18"></app-icon>
                <span class="text-[10px] font-bold uppercase tracking-wider">Chat</span>
            </button>
            <div class="w-px h-8 bg-[#222]"></div>
            <button (click)="activeTab.set('output')" class="flex flex-col items-center gap-1 p-2 transition-colors w-1/2" [class.text-neon-orange]="activeTab() === 'output'" [class.text-gray-500]="activeTab() !== 'output'">
                <app-icon name="terminal" [size]="18"></app-icon>
                <span class="text-[10px] font-bold uppercase tracking-wider">Output</span>
            </button>
         </div>

      </div>

    </main>
  `
})
export class AppComponent {
  private llmService = inject(LlmService);
  
  config = signal<ChatConfig>({ ...DEFAULT_CONFIG });
  messages = signal<ChatMessage[]>([
    { role: 'system', content: '[PIERRINGSHOT]: Sən peşəkar kodlaşdırma köməkçisisən.' }, 
    { role: 'user', content: 'Hello World in Python' }
  ]);
  response = signal<CompletionResponse | null>(null);
  
  // Metrics
  latency = signal<number>(0);
  startTime = signal<number>(0);
  
  sidebarCollapsed = signal(false);
  mobileSidebarOpen = signal(false);
  showSessionManager = signal(false);
  
  // Mobile UI State
  isMobile = signal(false);
  activeTab = signal<'chat' | 'output'>('chat');
  
  isLoading = this.llmService.loading;
  error = this.llmService.error;

  constructor() {
    this.checkScreenSize();
    this.loadFromLocalStorage();

    // Auto-save effect
    effect(() => {
      const state = {
        config: this.config(),
        messages: this.messages()
      };
      localStorage.setItem('typegpt_state', JSON.stringify(state));
    });
  }

  @HostListener('window:resize', ['$event'])
  onResize() {
    this.checkScreenSize();
  }

  checkScreenSize() {
    this.isMobile.set(window.innerWidth < 768);
    if (!this.isMobile()) {
        this.mobileSidebarOpen.set(false);
    }
  }

  toggleSidebar() {
      this.sidebarCollapsed.update(v => !v);
  }

  loadFromLocalStorage() {
    try {
      const saved = localStorage.getItem('typegpt_state');
      if (saved) {
        const state = JSON.parse(saved);
        if (state.config) this.config.set({ ...DEFAULT_CONFIG, ...state.config });
        if (state.messages && Array.isArray(state.messages)) this.messages.set(state.messages);
      }
    } catch (e) {
      console.error('Failed to load state', e);
    }
  }

  async handleRunRequest() {
    const start = Date.now();
    this.startTime.set(start);
    this.response.set(null);
    this.latency.set(0);
    
    if (this.isMobile()) {
        this.activeTab.set('output');
    }

    // Add empty assistant msg
    this.messages.update(msgs => [...msgs, { role: 'assistant', content: '' }]);
    const assistantIndex = this.messages().length - 1;

    try {
      // Use messages excluding the empty one
      for await (const chunk of this.llmService.streamMessage(this.config(), this.messages().slice(0, -1))) {
        this.response.set(chunk);
        
        // Live update chat
        const content = chunk.choices[0]?.message?.content || '';
        this.messages.update(msgs => {
           const newMsgs = [...msgs];
           newMsgs[assistantIndex] = { ...newMsgs[assistantIndex], content };
           return newMsgs;
        });

        this.latency.set(Date.now() - start);
      }
    } catch (err) {
      console.error(err);
      if (!this.messages()[assistantIndex].content) {
         this.messages.update(msgs => msgs.slice(0, -1));
      }
    }
  }

  handleImport(data: {config?: ChatConfig, messages?: ChatMessage[]}) {
    if (data.config) this.config.set({ ...DEFAULT_CONFIG, ...data.config });
    if (data.messages) this.messages.set(data.messages);
  }

  resetState() {
    if (confirm('Bütün sessiyanı sıfırlamaq istədiyinizə əminsiniz?')) {
       this.config.set({ ...DEFAULT_CONFIG });
       this.messages.set([
          { role: 'system', content: '[PIERRINGSHOT]: Sən peşəkar kodlaşdırma köməkçisisən.' }, 
          { role: 'user', content: 'Hello World in Python' }
       ]);
       this.response.set(null);
       localStorage.removeItem('typegpt_state');
    }
  }
}
