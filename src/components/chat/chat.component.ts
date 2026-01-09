
import { Component, model, input, output, ElementRef, ViewChild, signal, viewChildren, effect, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../ui/icon.component';
import { ChatMessage } from '../../services/llm.service';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  styles: [`
    :host {
      display: block;
      height: 100%;
    }
  `],
  template: `
    <div class="h-full flex flex-col bg-[#050505] relative font-sans overflow-hidden">
      
      <!-- Background Grid -->
      <div class="absolute inset-0 z-0 opacity-10 pointer-events-none" 
           style="background-image: linear-gradient(var(--border-color) 1px, transparent 1px), linear-gradient(90deg, var(--border-color) 1px, transparent 1px); background-size: 40px 40px;">
      </div>

      <!-- Header -->
      <div class="p-3 md:p-4 border-b border-cyber-border bg-[#0a0a0a] z-20 flex justify-between items-center h-[60px] md:h-[65px] flex-shrink-0 relative overflow-hidden">
        <div class="flex items-center gap-3 relative z-10">
           <div class="p-2 bg-neon-green/5 border border-neon-green/20 rounded-none text-neon-green"
                [class.text-neon-orange]="hasActiveTools()"
                [class.border-neon-orange]="hasActiveTools()">
             @if (hasActiveTools()) {
                <app-icon name="wrench" [size]="18"></app-icon>
             } @else {
                <app-icon name="message-square" [size]="18"></app-icon>
             }
           </div>
           <div>
              <h2 class="text-xs md:text-sm font-bold text-cyber-text uppercase tracking-[0.2em] font-mono">Chat Hub</h2>
              @if (hasActiveTools()) {
                <span class="text-[9px] text-neon-orange font-mono tracking-widest animate-pulse">TOOLS ENGAGED</span>
              }
           </div>
        </div>
        <div class="flex items-center gap-2 z-10">
           <button 
             (click)="clearMessages()" 
             class="text-[10px] text-neon-red border border-neon-red/30 hover:bg-neon-red/10 flex items-center gap-2 px-2 md:px-3 py-1.5 transition-all uppercase tracking-widest font-bold font-mono group"
           >
             <app-icon name="trash" [size]="12"></app-icon>
             <span class="hidden md:inline group-hover:inline">Təmizlə</span>
           </button>
        </div>
      </div>

      <!-- Messages List -->
      <div class="flex-1 overflow-y-auto p-3 md:p-6 space-y-4 md:space-y-6 z-10 custom-scrollbar pb-28 md:pb-36 overscroll-contain bg-[#050505]" #scrollContainer>
        @for (msg of messages(); track $index) {
          <div class="group relative border bg-[#0a0a0a]/80 p-1 transition-all hover:shadow-[0_0_20px_rgba(0,0,0,0.5)]"
               [ngClass]="getRoleStyles(msg.role)">
            
            <!-- Handle & Controls -->
            <div class="flex items-center justify-between px-3 py-2 border-b border-white/5 bg-white/5">
              <div class="flex items-center gap-2">
                 <span class="text-[10px] font-mono opacity-50 uppercase tracking-widest">UNIT:</span>
                 <select 
                  [(ngModel)]="msg.role"
                  class="bg-transparent text-xs font-bold uppercase tracking-wide border-none focus:ring-0 cursor-pointer hover:text-white transition-colors appearance-none pr-4 font-mono"
                  [class.text-neon-red]="msg.role === 'system'"
                  [class.text-neon-green]="msg.role === 'user'"
                  [class.text-neon-blue]="msg.role === 'assistant'"
                >
                  <option value="system" class="bg-cyber-black text-neon-red">SYSTEM</option>
                  <option value="user" class="bg-cyber-black text-neon-green">USER</option>
                  <option value="assistant" class="bg-cyber-black text-neon-blue">ASSISTANT</option>
                </select>
              </div>

              <div class="flex items-center gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  (click)="removeMessage($index)"
                  class="text-cyber-muted hover:text-neon-red transition-all p-1"
                >
                  <app-icon name="x" [size]="14"></app-icon>
                </button>
              </div>
            </div>

            <!-- Editor -->
            <div class="p-1 relative">
                <textarea
                  #textareaRef
                  [ngModel]="msg.content"
                  (ngModelChange)="updateMessageContent($index, $event)"
                  placeholder="Daxil et..."
                  class="w-full bg-transparent p-3 text-sm text-cyber-text placeholder-cyber-border focus:outline-none resize-none font-mono leading-relaxed block transition-all duration-200 min-h-[60px]"
                  (focus)="onFocus($index)"
                  (blur)="onBlur($index)"
                  (input)="autoResize($event)"
                  (keydown.control.enter)="submit()"
                ></textarea>
            </div>
          </div>
        }

        <!-- Add Button -->
        <button 
          (click)="addMessage()"
          class="w-full py-3 md:py-4 border border-dashed border-cyber-border hover:border-neon-green/50 bg-[#0a0a0a] hover:bg-neon-green/5 text-cyber-muted hover:text-neon-green transition-all flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em] font-mono group"
        >
          <app-icon name="plus" [size]="14" class="group-hover:rotate-90 transition-transform duration-300"></app-icon>
          <span>Yeni Blok</span>
        </button>
      </div>

      <!-- Command Dock -->
      <div class="absolute bottom-0 left-0 w-full z-30 pointer-events-none">
         <div class="h-28 md:h-32 bg-gradient-to-t from-cyber-black via-cyber-black/95 to-transparent flex flex-col justify-end items-center pb-4 md:pb-6 px-4 md:px-6">
            
            <div class="w-full max-w-lg relative group pointer-events-auto">
              <button 
                (click)="submit()"
                [disabled]="loading()"
                class="w-full h-11 md:h-12 bg-cyber-dark border border-neon-green text-neon-green font-bold shadow-[0_0_15px_rgba(0,255,65,0.2)] hover:bg-neon-green hover:text-black transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-[0.2em] font-mono relative overflow-hidden text-xs md:text-sm"
                [class.border-neon-red]="loading()"
                [class.text-neon-red]="loading()"
                [class.bg-neon-red/10]="loading()"
              >
                @if (loading()) {
                  <span class="animate-pulse">SORĞU İCRA EDİLİR...</span>
                } @else {
                   <span>SORĞUNU İCRA ET</span>
                }
              </button>
            </div>
         </div>
      </div>
    </div>
  `
})
export class ChatComponent implements OnDestroy {
  messages = model.required<ChatMessage[]>();
  loading = input<boolean>(false);
  hasActiveTools = input<boolean>(false);
  runRequest = output<void>();

  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;
  textareas = viewChildren<ElementRef<HTMLTextAreaElement>>('textareaRef');
  focusedIndex = signal<number | null>(null);

  constructor() {
    effect(() => {
      const msgs = this.messages();
      const els = this.textareas();
      setTimeout(() => {
        els.forEach((t) => {
             this.adjustHeight(t.nativeElement);
        });
      });
    });
  }

  ngOnDestroy() {}

  getRoleStyles(role: string): string {
    switch (role) {
      case 'system': return 'border-neon-red/30 shadow-[0_0_10px_rgba(255,0,60,0.05)]';
      case 'user': return 'border-neon-green/30 shadow-[0_0_10px_rgba(0,255,65,0.05)]';
      case 'assistant': return 'border-neon-blue/30 shadow-[0_0_10px_rgba(0,209,255,0.05)]';
      default: return 'border-cyber-border';
    }
  }

  addMessage() {
    this.messages.update(msgs => [...msgs, { role: 'user', content: '' }]);
    this.scrollToBottom();
  }

  removeMessage(index: number) {
    this.messages.update(msgs => msgs.filter((_, i) => i !== index));
  }

  clearMessages() {
    this.messages.set([{ role: 'system', content: 'You are a helpful AI assistant.' }]);
  }

  updateMessageContent(index: number, content: string) {
    this.messages.update(msgs => {
      const newMsgs = [...msgs];
      newMsgs[index] = { ...newMsgs[index], content };
      return newMsgs;
    });
  }

  submit() {
    if (!this.loading()) {
      this.runRequest.emit();
    }
  }

  onFocus(index: number) { this.focusedIndex.set(index); }
  onBlur(index: number) { this.focusedIndex.set(null); }

  adjustHeight(element: HTMLTextAreaElement) {
    element.style.height = 'auto';
    element.style.height = `${element.scrollHeight}px`;
  }

  autoResize(event: Event) {
    this.adjustHeight(event.target as HTMLTextAreaElement);
  }

  scrollToBottom() {
    setTimeout(() => {
      if (this.scrollContainer?.nativeElement) {
        this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
      }
    }, 50);
  }
}
