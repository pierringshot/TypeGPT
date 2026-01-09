
import { Component, model, signal, computed, output, input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../ui/icon.component';
import { ChatConfig, Tool } from '../../services/llm.service';
import { TtsService } from '../../services/tts.service';

interface ModelDefinition {
  id: string;
  provider: string;
  name: string;
  description: string;
  contextWindow: string;
  maxOutput: string;
  tags: string[]; 
  supportsTools: boolean;
}

interface ToolPreset {
  id: string;
  name: string;
  description: string; 
  usage: string; 
  tool: Tool; 
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <div class="h-full flex flex-col bg-[#050505] border-r border-cyber-border text-sm overflow-hidden font-sans transition-all duration-300 relative shadow-[10px_0_40px_rgba(0,0,0,0.8)] z-50 w-full"
         [class.md:w-80]="!collapsed()"
         [class.md:w-[60px]]="collapsed()">
      
      <!-- Brand Header -->
      <div class="p-4 border-b border-cyber-border flex items-center justify-between bg-[#0a0a0a] flex-shrink-0 h-[65px] relative overflow-hidden">
        <div class="absolute inset-0 bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAIklEQVQIW2NkQAKrVq36zwjjgzj//v37zwjjgzhhYWGMYAIAI8YOAj+51n4AAAAASUVORK5CYII=')] opacity-10 pointer-events-none"></div>
        
        @if (!collapsed()) {
          <div class="flex items-center gap-2 text-neon-green overflow-hidden whitespace-nowrap z-10">
             <div class="w-8 h-8 bg-neon-green/5 border border-neon-green/20 flex items-center justify-center relative group flex-shrink-0">
               <app-icon name="terminal" [size]="18" class="relative z-10 text-neon-green drop-shadow-[0_0_5px_rgba(0,255,65,0.8)]"></app-icon>
             </div>
             <div class="flex flex-col animate-in fade-in slide-in-from-left-2 duration-300">
               <span class="font-bold tracking-widest text-cyber-text glitch-hover cursor-default font-mono">PIERRINGSHOT</span>
               <span class="text-[8px] text-neon-blue font-mono tracking-[0.3em] uppercase">ELECTRONICS™ v2.1.0</span>
             </div>
          </div>
          
          <div class="flex gap-1 z-10">
            <button (click)="openSessionManager.emit()" class="p-2 text-cyber-muted hover:text-white hover:bg-white/10 transition-all border border-transparent hover:border-cyber-muted/30" title="Session Manager">
               <app-icon name="file-code" [size]="16"></app-icon>
            </button>
            <button (click)="resetToDefaults.emit()" class="p-2 text-cyber-muted hover:text-neon-red hover:bg-neon-red/10 transition-all border border-transparent hover:border-neon-red/30" title="Sıfırla">
              <app-icon name="rotate-ccw" [size]="16"></app-icon>
            </button>
          </div>
        } @else {
           <div class="w-full flex justify-center z-10">
             <button (click)="toggleCollapse.emit()" class="text-cyber-muted hover:text-white">
               <app-icon name="chevron-right" [size]="20"></app-icon>
             </button>
           </div>
        }
      </div>
      
      <!-- Collapse Toggle (Desktop) -->
      @if(!collapsed()) {
         <button 
           (click)="toggleCollapse.emit()"
           class="hidden md:flex absolute top-1/2 -right-3 w-6 h-6 bg-cyber-black border border-cyber-border items-center justify-center text-cyber-muted hover:text-neon-blue hover:border-neon-blue transition-all z-50 shadow-lg"
         >
           <app-icon name="chevron-left" [size]="14"></app-icon>
         </button>
      }

      <!-- Settings Scroll Area -->
      <div class="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-8 min-h-0 bg-[#050505] relative" [class.hidden]="collapsed()">
        
        <!-- API Connection -->
        <section class="space-y-4">
           <h3 class="text-[10px] font-bold text-neon-purple uppercase tracking-[0.2em] flex items-center gap-2 font-mono">
             <span class="w-2 h-0.5 bg-neon-purple"></span>
             Bağlantı Protokolu
           </h3>
           
           <div class="space-y-1.5 group">
             <label class="text-[10px] text-cyber-muted group-hover:text-cyber-text transition-colors font-mono">Base URL</label>
             <div class="relative">
                <input 
                  type="text" 
                  [(ngModel)]="config().baseUrl"
                  class="input-cyber w-full p-2 text-[11px] rounded-none bg-[#0a0a0a]"
                  placeholder="https://..."
                />
             </div>
           </div>

           <div class="space-y-1.5 group">
             <label class="text-[10px] text-cyber-muted group-hover:text-cyber-text transition-colors font-mono">API Key</label>
             <div class="relative">
               <input 
                 [type]="showKey() ? 'text' : 'password'" 
                 [(ngModel)]="config().apiKey"
                 class="input-cyber w-full p-2 text-[11px] rounded-none pr-10 text-neon-purple bg-[#0a0a0a]"
               />
               <button 
                 (click)="toggleKey()" 
                 class="absolute right-2 top-2 text-cyber-muted hover:text-white transition-colors"
               >
                 <app-icon [name]="showKey() ? 'eye-off' : 'eye'" [size]="14"></app-icon>
               </button>
             </div>
           </div>
        </section>

        <!-- Model Selection -->
        <section class="space-y-4 relative z-20">
           <h3 class="text-[10px] font-bold text-neon-blue uppercase tracking-[0.2em] flex items-center gap-2 font-mono">
             <span class="w-2 h-0.5 bg-neon-blue"></span>
             Neural Model
           </h3>
           
           <div class="relative">
             <button 
               (click)="toggleModelDropdown()"
               class="input-cyber w-full p-3 rounded-none text-left flex justify-between items-center group border-l-2 border-l-transparent hover:border-l-neon-blue bg-[#0a0a0a]"
             >
               <div class="flex items-center gap-3 overflow-hidden">
                 <div [class]="getProviderColor(selectedModelData()?.provider) + ' w-2 h-2 rounded-full shadow-[0_0_8px_currentColor]'"></div>
                 <span class="text-xs font-mono font-medium text-cyber-text truncate">{{ config().model }}</span>
               </div>
               <app-icon name="chevron-down" [size]="14" class="text-cyber-muted group-hover:text-neon-blue flex-shrink-0 ml-2"></app-icon>
             </button>

             @if (showModelDropdown()) {
                <div class="absolute top-full left-0 w-full mt-1 bg-cyber-black border border-cyber-border shadow-[0_10px_40px_rgba(0,0,0,0.9)] z-50 overflow-hidden flex flex-col max-h-80 animate-in fade-in duration-200">
                  <div class="p-2 border-b border-cyber-border bg-cyber-dark">
                    <input 
                      type="text" 
                      [(ngModel)]="modelSearch"
                      placeholder="MODEL AXTAR..."
                      class="w-full bg-black border border-cyber-border p-2 text-[10px] text-neon-green font-mono focus:outline-none focus:border-neon-green uppercase"
                      autoFocus
                    />
                  </div>
                  <div class="overflow-y-auto flex-1">
                    @for (m of filteredModels(); track m.id) {
                      <button 
                        (click)="selectModel(m)"
                        class="w-full text-left px-4 py-3 text-xs border-l-2 border-transparent hover:bg-white/5 hover:border-l-neon-green hover:text-cyber-text transition-all flex items-center justify-between group"
                        [class.bg-white/5]="m.id === config().model"
                        [class.border-l-neon-green]="m.id === config().model"
                        [class.text-neon-green]="m.id === config().model"
                        [class.text-cyber-muted]="m.id !== config().model"
                      >
                        <div class="flex flex-col overflow-hidden">
                           <span class="truncate pr-2 font-mono font-bold">{{ m.id }}</span>
                           <span class="text-[9px] opacity-60">{{ m.name }}</span>
                        </div>
                        <div class="flex items-center gap-2">
                           @if(m.supportsTools) {
                             <app-icon name="wrench" [size]="10" class="text-neon-orange opacity-50"></app-icon>
                           }
                           <span class="text-[9px] font-mono opacity-30">{{m.tags[0]}}</span>
                        </div>
                      </button>
                    }
                  </div>
                </div>
                <div (click)="showModelDropdown.set(false)" class="fixed inset-0 z-40 bg-transparent"></div>
             }
           </div>
        </section>

        <!-- Parameters & Audio Matrix -->
        <section class="space-y-6">
           <h3 class="text-[10px] font-bold text-neon-green uppercase tracking-[0.2em] flex items-center gap-2 font-mono">
             <span class="w-2 h-0.5 bg-neon-green"></span>
             Parameters & Audio
           </h3>
           
           <!-- Temperature -->
           <div class="space-y-2">
             <div class="flex justify-between items-center text-[10px] font-mono">
               <label class="text-cyber-muted">Temperature</label>
               <span class="text-neon-green">{{ config().temperature }}</span>
             </div>
             <input type="range" min="0" max="2" step="0.1" [(ngModel)]="config().temperature" 
               class="w-full h-1 bg-cyber-border rounded-none appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-2 [&::-webkit-slider-thumb]:bg-neon-green [&::-webkit-slider-thumb]:hover:shadow-[0_0_8px_#00ff41]"/>
           </div>
           
            <!-- Max Tokens -->
           <div class="space-y-2">
             <div class="flex justify-between items-center text-[10px] font-mono">
               <label class="text-cyber-muted">Max Tokens</label>
               <span class="text-neon-blue">{{ config().maxTokens }}</span>
             </div>
             <input type="range" min="256" max="32000" step="256" [(ngModel)]="config().maxTokens" 
               class="w-full h-1 bg-cyber-border rounded-none appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-2 [&::-webkit-slider-thumb]:bg-neon-blue"/>
           </div>

           <!-- Audio Matrix V2 -->
           <div class="bg-[#0f0f0f] border border-cyber-border group overflow-hidden relative">
              <div class="absolute top-0 right-0 p-1">
                 <div class="w-1.5 h-1.5 bg-neon-blue rounded-full animate-pulse-fast opacity-50"></div>
              </div>

              <div class="p-3 border-b border-cyber-border bg-cyber-dark/50">
                <h4 class="text-[9px] font-bold text-neon-blue uppercase tracking-widest font-mono flex items-center gap-2">
                  <app-icon name="volume-2" [size]="12"></app-icon>
                  Audio Matrix (Neural)
                </h4>
              </div>
              
              <div class="p-3 space-y-4">
                <!-- Voice Selector -->
                <div class="space-y-1">
                   <label class="text-[9px] text-cyber-muted font-mono uppercase">Neural Voice</label>
                   <div class="relative">
                     <select 
                        [ngModel]="tts.selectedVoiceId()"
                        (ngModelChange)="tts.selectedVoiceId.set($event)"
                        class="input-cyber w-full p-2 text-[10px] rounded-none appearance-none cursor-pointer truncate pr-6 bg-[#0a0a0a] border-neon-blue/30"
                      >
                        @for (voice of tts.voices; track voice.id) {
                          <option [value]="voice.id" class="bg-cyber-black">{{ voice.name }}</option>
                        }
                     </select>
                     <app-icon name="chevron-down" [size]="12" class="absolute right-2 top-3 text-neon-blue pointer-events-none"></app-icon>
                   </div>
                   <!-- Badges -->
                   @if (getSelectedVoice(); as v) {
                     <div class="flex flex-wrap gap-1 mt-2">
                       @for (tag of v.tags; track tag) {
                         <span class="text-[8px] px-1.5 py-0.5 border border-cyber-border bg-white/5 text-cyber-text rounded-sm uppercase tracking-wider font-mono"
                               [class.text-neon-green]="tag.includes('az-AZ')">
                           {{ tag }}
                         </span>
                       }
                     </div>
                   }
                </div>

                <!-- Speed -->
                <div class="space-y-1">
                    <div class="flex justify-between text-[9px] text-cyber-muted font-mono">
                        <span>Speed</span>
                        <span class="text-neon-blue">{{ tts.speed() }}x</span>
                    </div>
                    <input type="range" min="0.25" max="2.0" step="0.25" 
                      [ngModel]="tts.speed()" (ngModelChange)="tts.speed.set($event)"
                      class="w-full h-1 bg-cyber-border rounded-none appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-2 [&::-webkit-slider-thumb]:bg-neon-blue"
                    />
                 </div>

                <!-- Thinking Mute Toggle -->
                <div class="flex items-center justify-between pt-2 border-t border-cyber-border">
                   <div class="flex flex-col">
                     <span class="text-[9px] text-cyber-text font-bold font-mono">DÜŞÜNCƏNİ SƏSSİZLƏŞDİR</span>
                     <span class="text-[8px] text-cyber-muted">&lt;think&gt; blokunu oxuma</span>
                   </div>
                   <button 
                     (click)="toggleMuteThinking()"
                     class="w-8 h-4 bg-cyber-black border border-cyber-border relative transition-colors duration-200"
                     [class.border-neon-green]="!tts.readThinking()"
                     [class.bg-neon-green/10]="!tts.readThinking()"
                   >
                      <div class="absolute top-0.5 left-0.5 w-2.5 h-2.5 bg-cyber-muted transition-transform duration-200"
                           [class.translate-x-4]="!tts.readThinking()"
                           [class.bg-neon-green]="!tts.readThinking()"
                           [class.translate-x-0]="tts.readThinking()"
                      ></div>
                   </button>
                </div>
              </div>
           </div>
        </section>

        <!-- Tools Section (Conditional) -->
        @if (selectedModelData()?.supportsTools) {
          <section class="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
             <h3 class="text-[10px] font-bold text-neon-orange uppercase tracking-[0.2em] flex items-center gap-2 font-mono">
               <span class="w-2 h-0.5 bg-neon-orange"></span>
               Alət Seçimi
             </h3>
             
             <div class="space-y-2">
               <div class="flex gap-2">
                 <div class="relative flex-1">
                   <select 
                     [value]="selectedPresetId()"
                     (change)="onPresetChange($any($event).target.value)"
                     class="input-cyber w-full p-2 text-xs rounded-none appearance-none cursor-pointer bg-[#0a0a0a]"
                   >
                     <option value="" disabled selected>Alət seç...</option>
                     @for (preset of toolPresets; track preset.id) {
                       <option [value]="preset.id">{{ preset.name }}</option>
                     }
                   </select>
                   <app-icon name="chevron-down" [size]="12" class="absolute right-2 top-3 text-cyber-muted pointer-events-none"></app-icon>
                 </div>
                 <button 
                   (click)="addTool()"
                   class="p-2 bg-cyber-dark border border-cyber-border hover:border-neon-orange hover:text-neon-orange transition-colors"
                   title="Add Tool"
                 >
                   <app-icon name="plus" [size]="14"></app-icon>
                 </button>
               </div>

               @if (toolError()) {
                 <div class="text-[10px] text-neon-red bg-neon-red/5 border border-neon-red/20 p-2 font-mono flex items-center gap-2">
                   <app-icon name="x" [size]="12"></app-icon>
                   {{ toolError() }}
                 </div>
               }

               <!-- Active Tools List -->
               <div class="space-y-2 mt-4">
                 @if (config().tools.length > 0) {
                   <div class="text-[9px] text-cyber-muted font-bold uppercase tracking-widest mb-2 font-mono">Aktiv Funksiyalar:</div>
                 }
                 
                 @for (tool of config().tools; track tool.function.name; let i = $index) {
                   <div class="bg-cyber-dark/50 border border-cyber-border group hover:border-neon-orange hover:bg-neon-orange/10 transition-all duration-300 cursor-default">
                     <div class="flex items-center justify-between p-2">
                       <div class="flex items-center gap-2 overflow-hidden">
                         @if (tool.function.name === 'execute_python') {
                            <app-icon name="terminal" [size]="12" class="text-neon-green flex-shrink-0"></app-icon>
                         } @else if (tool.function.name === 'get_current_weather') {
                            <app-icon name="sun" [size]="12" class="text-neon-blue flex-shrink-0"></app-icon>
                         } @else {
                            <app-icon name="wrench" [size]="12" class="text-neon-orange flex-shrink-0"></app-icon>
                         }
                         <span class="text-[10px] font-mono text-cyber-text truncate group-hover:text-white transition-colors">{{ tool.function.name }}</span>
                       </div>
                       <button (click)="removeTool(i)" class="p-1 text-cyber-muted hover:text-neon-red transition-colors opacity-50 group-hover:opacity-100 cursor-pointer">
                           <app-icon name="x" [size]="10"></app-icon>
                       </button>
                     </div>
                   </div>
                 }
               </div>
             </div>
          </section>
        }

      </div>

      <!-- Footer Branding & Theme -->
      <div class="p-4 border-t border-cyber-border bg-cyber-black relative z-10 flex-shrink-0 flex items-center justify-between gap-2" [class.flex-col]="collapsed()">
         @if (!collapsed()) {
            <a href="https://github.com/pierringshot" target="_blank" class="block group text-center flex-1">
                <div class="text-[10px] font-mono font-bold text-cyber-muted group-hover:text-neon-blue transition-colors tracking-[0.2em] mb-1 glitch-hover">
                [PIERRINGSHOT ELECTRONICS™]
                </div>
                <div class="text-[8px] text-cyber-muted/50 font-mono italic">
                  Fair Use Policy: İcma üçün. Spam etməyin.
                </div>
            </a>
         }
      </div>
    </div>
  `
})
export class SidebarComponent {
  tts = inject(TtsService);
  config = model.required<ChatConfig>();
  collapsed = input<boolean>(false);

  resetToDefaults = output<void>();
  openSessionManager = output<void>();
  triggerUpload = output<void>();
  toggleCollapse = output<void>();
  closeMobile = output<void>();
  
  showKey = signal(false);
  showModelDropdown = signal(false);
  modelSearch = signal('');

  selectedPresetId = signal('');
  toolError = signal<string | null>(null);

  // Full Model List as per TypeGPT specs
  fullModels: ModelDefinition[] = [
    { id: 'zai-org/GLM-4.6', provider: 'ZhipuAI', name: 'GLM 4.6', description: 'Advanced general purpose.', contextWindow: '128k', maxOutput: '4096', tags: ['General'], supportsTools: true },
    { id: 'deepseek-ai/DeepSeek-R1-0528', provider: 'DeepSeek', name: 'DeepSeek R1', description: 'Reasoning expert.', contextWindow: '128k', maxOutput: '8192', tags: ['Reasoning'], supportsTools: false },
    { id: 'Qwen/Qwen3-235B-A22B-Thinking-2507', provider: 'Qwen', name: 'Qwen3 Thinking', description: 'Chain of Thought.', contextWindow: '32k', maxOutput: '8192', tags: ['Thinking'], supportsTools: false },
    { id: 'Qwen/Qwen3-235B-A22B-Instruct-2507', provider: 'Qwen', name: 'Qwen3 Instruct', description: 'Standard Instruct.', contextWindow: '32k', maxOutput: '4096', tags: ['Instruct'], supportsTools: true },
    { id: 'moonshotai/kimi-k2-instruct-0905', provider: 'Moonshot', name: 'Kimi k2', description: 'Balanced model.', contextWindow: '200k', maxOutput: '4096', tags: ['Instruct'], supportsTools: true },
    { id: 'moonshotai/kimi-k2-thinking', provider: 'Moonshot', name: 'Kimi k2 Think', description: 'Reasoning focus.', contextWindow: '128k', maxOutput: '8192', tags: ['Thinking'], supportsTools: false },
    { id: 'moonshotai/kimi-k2-instruct', provider: 'Moonshot', name: 'Kimi k2 Inst', description: 'General use.', contextWindow: '128k', maxOutput: '4096', tags: ['Instruct'], supportsTools: true },
    { id: 'qwen/qwen3-coder-480b-a35b-instruct', provider: 'Qwen', name: 'Qwen3 Coder', description: 'Coding specialist.', contextWindow: '128k', maxOutput: '8192', tags: ['Coding'], supportsTools: true },
    { id: 'deepseek-ai/deepseek-r1', provider: 'DeepSeek', name: 'DeepSeek R1 Orig', description: 'Original R1.', contextWindow: '128k', maxOutput: '8192', tags: ['Reasoning'], supportsTools: false },
    { id: 'deepseek-ai/deepseek-r1-0528', provider: 'DeepSeek', name: 'DeepSeek R1 Upd', description: 'Updated R1.', contextWindow: '128k', maxOutput: '8192', tags: ['Reasoning'], supportsTools: false },
    { id: 'openai/gpt-oss-120b', provider: 'OpenAI', name: 'GPT OSS 120B', description: 'High capacity open source.', contextWindow: '128k', maxOutput: '4096', tags: ['General'], supportsTools: true },
    { id: 'openai/gpt-oss-20b', provider: 'OpenAI', name: 'GPT OSS 20B', description: 'Efficient open source.', contextWindow: '32k', maxOutput: '4096', tags: ['Fast'], supportsTools: true },
    { id: 'mistralai/mistral-large-3-675b-instruct-2512', provider: 'Mistral', name: 'Mistral Large 3', description: 'European flagship.', contextWindow: '128k', maxOutput: '4096', tags: ['Instruct'], supportsTools: true },
    { id: 'deepseek-ai/deepseek-v3.1-terminus', provider: 'DeepSeek', name: 'DeepSeek V3.1 T', description: 'Logic optimized.', contextWindow: '64k', maxOutput: '8192', tags: ['Coding'], supportsTools: true },
    { id: 'deepseek-ai/deepseek-v3.1', provider: 'DeepSeek', name: 'DeepSeek V3.1', description: 'General coding.', contextWindow: '64k', maxOutput: '8192', tags: ['Coding'], supportsTools: true },
    { id: 'mistralai/mistral-large', provider: 'Mistral', name: 'Mistral Large', description: 'Classic large.', contextWindow: '128k', maxOutput: '4096', tags: ['Instruct'], supportsTools: true },
    { id: 'mistralai/mistral-small-24b-instruct', provider: 'Mistral', name: 'Mistral Small', description: 'Fast instruct.', contextWindow: '32k', maxOutput: '4096', tags: ['Fast'], supportsTools: true },
    { id: 'mistralai/magistral-small-2506', provider: 'Mistral', name: 'Magistral Small', description: 'Experimental.', contextWindow: '32k', maxOutput: '4096', tags: ['Fast'], supportsTools: true },
    { id: 'mistralai/mistral-small-3.1-24b-instruct-2503', provider: 'Mistral', name: 'Mistral S 3.1', description: 'Updated small.', contextWindow: '32k', maxOutput: '4096', tags: ['Fast'], supportsTools: true },
    { id: 'mistralai/ministral-14b-instruct-2512', provider: 'Mistral', name: 'Ministral 14B', description: 'Edge optimized.', contextWindow: '16k', maxOutput: '2048', tags: ['Edge'], supportsTools: true },
    { id: 'qwen/qwen3-next-80b-a3b-thinking', provider: 'Qwen', name: 'Qwen3 Next Think', description: 'Next gen reasoning.', contextWindow: '64k', maxOutput: '8192', tags: ['Thinking'], supportsTools: false },
    { id: 'qwen/qwen3-next-80b-a3b-instruct', provider: 'Qwen', name: 'Qwen3 Next Inst', description: 'Next gen instruct.', contextWindow: '64k', maxOutput: '4096', tags: ['Instruct'], supportsTools: true }
  ];

  toolPresets: ToolPreset[] = [
    {
      id: 'weather',
      name: 'Hava Proqnozu',
      description: 'Fetch real-time weather data.',
      usage: 'Weather in Baku?',
      tool: {
        type: 'function',
        function: {
          name: 'get_current_weather',
          description: 'Get the current weather in a given location',
          parameters: {
            type: 'object',
            properties: {
              location: { type: 'string', description: 'The city and state' },
              unit: { type: 'string', enum: ['celsius', 'fahrenheit'] },
            },
            required: ['location'],
          },
        },
      }
    },
    {
      id: 'search',
      name: 'Google Axtarış',
      description: 'Access the internet.',
      usage: 'Latest iPhone specs',
      tool: {
        type: 'function',
        function: {
          name: 'google_search',
          description: 'Search the web for information',
          parameters: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'The search query' },
            },
            required: ['query'],
          },
        },
      }
    },
    {
      id: 'code_interpreter',
      name: 'Kod Tərcüməçisi',
      description: 'Python kodunu icra et.',
      usage: 'print("Hello World")',
      tool: {
        type: 'function',
        function: {
          name: 'execute_python',
          description: 'Execute a snippet of Python code',
          parameters: {
            type: 'object',
            properties: {
              code: { type: 'string', description: 'The Python code to execute' },
            },
            required: ['code'],
          },
        },
      }
    }
  ];

  filteredModels = computed(() => {
    const search = this.modelSearch().toLowerCase();
    return this.fullModels.filter(m => 
      m.id.toLowerCase().includes(search) || 
      m.name.toLowerCase().includes(search) ||
      m.tags.some(t => t.toLowerCase().includes(search))
    );
  });

  selectedModelData = computed(() => {
    return this.fullModels.find(m => m.id === this.config().model) || null;
  });

  getSelectedVoice() {
    return this.tts.voices.find(v => v.id === this.tts.selectedVoiceId());
  }

  getProviderColor(provider: string = ''): string {
    const p = provider.toLowerCase();
    if (p.includes('deepseek')) return 'bg-blue-500 text-blue-500';
    if (p.includes('qwen')) return 'bg-purple-500 text-purple-500';
    if (p.includes('mistral')) return 'bg-orange-500 text-orange-500';
    if (p.includes('openai')) return 'bg-green-500 text-green-500';
    if (p.includes('moonshot')) return 'bg-pink-500 text-pink-500';
    return 'bg-gray-500 text-gray-500';
  }

  toggleKey() {
    this.showKey.update(v => !v);
  }

  toggleModelDropdown() {
    this.showModelDropdown.update(v => !v);
    if (this.showModelDropdown()) {
      this.modelSearch.set('');
    }
  }

  selectModel(model: ModelDefinition) {
    const maxOut = parseInt(model.maxOutput, 10) || 4096;
    this.config.update(c => ({ 
      ...c, 
      model: model.id,
      maxTokens: maxOut // Auto-adjust max tokens based on model capacity
    }));
    this.showModelDropdown.set(false);
  }

  onPresetChange(id: string) {
    this.selectedPresetId.set(id);
    this.toolError.set(null);
  }

  addTool() {
    const presetId = this.selectedPresetId();
    if (!presetId) {
      this.toolError.set('Alət seçin.');
      return;
    }

    const preset = this.toolPresets.find(t => t.id === presetId);
    if (preset) {
      const currentTools = this.config().tools || [];
      if (currentTools.some(t => t.function.name === preset.tool.function.name)) {
        this.toolError.set('Artıq mövcuddur.');
        return;
      }
      const newTool = JSON.parse(JSON.stringify(preset.tool));
      this.toolError.set(null);
      this.config.update(c => {
         return { ...c, tools: [...currentTools, newTool] };
      });
    }
  }

  removeTool(index: number) {
    this.config.update(c => ({
      ...c,
      tools: c.tools.filter((_, i) => i !== index)
    }));
  }

  toggleMuteThinking() {
    this.tts.readThinking.update(v => !v);
  }
}
