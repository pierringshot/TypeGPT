
import { Component, input, signal, computed, ViewEncapsulation, OnDestroy, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../ui/icon.component';
import { CompletionResponse, ChatConfig } from '../../services/llm.service';
import { TtsService } from '../../services/tts.service';
import { parse } from 'marked';

@Component({
  selector: 'app-output',
  standalone: true,
  imports: [CommonModule, IconComponent, FormsModule],
  encapsulation: ViewEncapsulation.None,
  styles: [`
    app-output { display: block; height: 100%; }
    .markdown-body { color: var(--text-main); font-family: 'Inter', sans-serif; line-height: 1.6; font-size: 0.9rem; }
    .markdown-body h1, .markdown-body h2, .markdown-body h3 { color: var(--accent-green); font-family: 'JetBrains Mono', monospace; font-weight: bold; margin-top: 1.5em; border-bottom: 1px solid rgba(0,255,65,0.2); padding-bottom: 0.2em; }
    .markdown-body code { background: rgba(0,255,65,0.1); color: var(--accent-green); padding: 0.2em 0.4em; font-family: 'JetBrains Mono', monospace; font-size: 0.8em; }
    .markdown-body pre { background: #0a0a0a; border: 1px solid #333; padding: 1em; overflow-x: auto; margin: 1em 0; transition: border-color 0.3s ease; }
    .markdown-body pre:hover { border-color: var(--accent-green); box-shadow: 0 0 10px rgba(0, 255, 65, 0.1); }
    .markdown-body pre code { background: transparent; color: #ccc; padding: 0; }
    .markdown-body strong { color: #fff; }
    .markdown-body blockquote { border-left: 3px solid var(--accent-purple); color: #888; padding-left: 1em; font-style: italic; }
    /* Hide scrollbar for metrics */
    .scrollbar-hide::-webkit-scrollbar { display: none; }
    .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
  `],
  template: `
    <div class="h-full flex flex-col bg-[#050505] border-l border-cyber-border font-mono text-sm relative overflow-hidden">
      
      <!-- Metrics Header -->
      <div class="h-[60px] md:h-[65px] bg-[#0a0a0a] border-b border-cyber-border flex items-center justify-between px-3 md:px-4 z-10 gap-2">
         <div class="flex items-center gap-4 text-[10px] uppercase tracking-widest text-cyber-muted overflow-x-auto scrollbar-hide whitespace-nowrap mask-linear-fade">
            <div class="flex flex-col flex-shrink-0">
               <span class="text-[8px]">Latency</span>
               <span class="text-neon-blue font-bold text-xs">{{ latency() }}<span class="text-[8px]">ms</span></span>
            </div>
            <div class="h-6 w-px bg-cyber-border flex-shrink-0"></div>
            <div class="flex flex-col flex-shrink-0">
               <span class="text-[8px]">Speed</span>
               <span class="text-neon-green font-bold text-xs">{{ tokensPerSec() }}<span class="text-[8px]">T/s</span></span>
            </div>
            <div class="h-6 w-px bg-cyber-border flex-shrink-0"></div>
            <div class="flex flex-col flex-shrink-0">
               <span class="text-[8px]">Audio Lat.</span>
               <span class="text-neon-orange font-bold text-xs">{{ tts.audioLatency() }}<span class="text-[8px]">ms</span></span>
            </div>
            <div class="h-6 w-px bg-cyber-border flex-shrink-0"></div>
            <div class="flex flex-col flex-shrink-0">
               <span class="text-[8px]">Lang</span>
               <span class="text-neon-purple font-bold text-xs uppercase">{{ tts.detectedLanguage() }}</span>
            </div>
         </div>
         
         <div class="flex gap-2 flex-shrink-0">
            <button (click)="viewMode.set('render')" [class.text-neon-green]="viewMode() === 'render'" class="text-cyber-muted hover:text-white uppercase text-[10px] font-bold tracking-widest">Render</button>
            <span class="text-cyber-border">/</span>
            <button (click)="viewMode.set('raw')" [class.text-neon-orange]="viewMode() === 'raw'" class="text-cyber-muted hover:text-white uppercase text-[10px] font-bold tracking-widest">Stream</button>
         </div>
      </div>

      <!-- Main Terminal Area -->
      <div class="flex-1 overflow-y-auto custom-scrollbar relative p-4 bg-[#050505] bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAIklEQVQIW2NkQAKrVq36zwjjgzj//v37zwjjgzhhYWGMYAIAI8YOAj+51n4AAAAASUVORK5CYII=')]">
         
         @if (error()) {
            <div class="p-4 border border-neon-red/50 bg-neon-red/5 text-neon-red font-mono text-xs">
               <div class="uppercase font-bold tracking-widest mb-2">[CRITICAL ERROR]</div>
               {{ error() }}
            </div>
         } 
         @else if (!data() && !loading()) {
            <div class="h-full flex flex-col items-center justify-center opacity-20">
               <app-icon name="terminal" [size]="48" class="text-cyber-text mb-4"></app-icon>
               <span class="uppercase tracking-[0.5em] text-xs">AWAITING SIGNAL</span>
            </div>
         }
         @else {
            @if (viewMode() === 'render') {
               <div class="markdown-body" [innerHTML]="parsedContent()"></div>
               
               <!-- Audio Status -->
               @if (tts.isPlaying()) {
                 <div class="mt-4 p-2 border border-neon-blue/30 bg-neon-blue/5 flex items-center gap-3">
                    <div class="flex gap-1">
                      <div class="w-1 h-3 bg-neon-blue animate-[pulse_0.5s_infinite]"></div>
                      <div class="w-1 h-2 bg-neon-blue animate-[pulse_0.7s_infinite]"></div>
                      <div class="w-1 h-4 bg-neon-blue animate-[pulse_0.4s_infinite]"></div>
                    </div>
                    <span class="text-[10px] text-neon-blue font-bold tracking-widest uppercase">NATIVE_AUDIO_STREAM_STARTED</span>
                 </div>
               }

               @if(loading()) {
                  <span class="inline-block w-2 h-4 bg-neon-green animate-pulse ml-1 align-middle"></span>
               }
            } @else {
               <div class="font-mono text-xs text-neon-orange whitespace-pre-wrap break-all">{{ getRawJson() }}</div>
            }
         }
      </div>

      <!-- Footer/Status -->
      <div class="h-6 bg-[#0a0a0a] border-t border-cyber-border flex items-center px-2 justify-between text-[9px] text-cyber-muted uppercase tracking-wider">
         <span>Term_v2.1.2_Audio_Matrix</span>
         <span class="text-neon-green" [class.animate-pulse]="loading()">{{ loading() ? 'RECEIVING DATA...' : 'IDLE' }}</span>
      </div>

    </div>
  `
})
export class OutputComponent implements OnDestroy {
  tts = inject(TtsService);

  data = input<CompletionResponse | null>(null);
  loading = input<boolean>(false);
  error = input<string | null>(null);
  latency = input<number>(0);
  startTime = input<number>(0);
  config = input.required<ChatConfig>();
  
  viewMode = signal<'render' | 'raw'>('render');
  
  // Metrics
  tokensPerSec = computed(() => {
     if (!this.startTime() || !this.data()) return '0.0';
     const content = this.data()?.choices[0]?.message?.content || '';
     const estimatedTokens = content.length / 4;
     const durationSec = (Date.now() - this.startTime()) / 1000;
     if (durationSec <= 0) return '0.0';
     return (estimatedTokens / durationSec).toFixed(1);
  });

  totalTokens = computed(() => {
     const usage = this.data()?.usage;
     if (usage) return usage.total_tokens;
     const content = this.data()?.choices[0]?.message?.content || '';
     return Math.floor(content.length / 4);
  });

  parsedContent = computed(() => {
    const content = this.data()?.choices[0]?.message?.content || '';
    return parse(content, { async: false, breaks: true, gfm: true }) as string;
  });

  constructor() {
    effect(() => {
        const d = this.data();
        const l = this.loading();
        
        // Trigger Audio Matrix only when complete for stability in this version
        if (!l && d) {
             const content = d.choices[0].message.content;
             this.tts.speak(content, this.config());
        }
    });
  }

  ngOnDestroy() {
    this.tts.stop();
  }

  getRawJson() {
    return JSON.stringify(this.data(), null, 2);
  }
}
