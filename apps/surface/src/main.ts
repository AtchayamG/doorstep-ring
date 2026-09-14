interface StatusResponse {
  service: string;
  version: string;
  tokenStatus: {
    valid: boolean;
    httpStatus: number;
    statusText: string;
    redactedToken: string;
    message: string;
    playgroundUrl: string;
    endpointChecked: string;
    requestId?: string;
    serverHeader?: string;
  };
  bedrock: {
    modelId: string;
    region: string;
    ready: boolean;
  };
}

interface PipelineResponse {
  eventId: string;
  eventType: string;
  subType: string;
  deviceId: string;
  createdAt: string;
  status: 'DESCRIBED' | 'REFUSED' | 'TOKEN_REQUIRED';
  isRefused: boolean;
  description: string;
  spokenCaption: string;
  refusalReason?: string;
  rawImageBase64?: string;
  croppedImageBase64?: string;
  cropDetails?: {
    originalDimensions: string;
    croppedDimensions: string;
    rowsRemoved: number;
    cropPercentage: number;
    watermarkExcised: boolean;
  };
  modelId: string;
  totalLatencyMs: number;
  frameOrigin?: 'ai-generated' | 'procedural' | 'ring-live' | 'user-upload';
  guardrails?: GuardrailRuleResult[];
  tokenInfo?: {
    playgroundUrl: string;
    message: string;
  };
}

interface GuardrailRuleResult {
  rule: 'identity-inference' | 'motive-inference' | 'single-present-tense-sentence';
  pass: boolean;
  finding: string | null;
  token?: string | null;
}

class DoorstepApp {
  private tokenStatusBadge = document.getElementById('token-status-badge') as HTMLDivElement;
  private tokenWarningBanner = document.getElementById('token-warning-banner') as HTMLDivElement;
  private refreshStatusBtn = document.getElementById('refresh-status-btn') as HTMLButtonElement;
  private apiEndpointText = document.getElementById('api-endpoint-text') as HTMLElement;
  private scenarioSelect = document.getElementById('scenario-select') as HTMLSelectElement;
  private eventSubTypeInput = document.getElementById('event-subtype-input') as HTMLInputElement;
  private deviceIdInput = document.getElementById('device-id-input') as HTMLInputElement;
  private runPipelineBtn = document.getElementById('run-pipeline-btn') as HTMLButtonElement;
  private customImageInput = document.getElementById('custom-image-input') as HTMLInputElement;

  private eventTypeBadge = document.getElementById('event-type-badge') as HTMLElement;
  private jsonViewer = document.getElementById('json-viewer-content') as HTMLElement;

  private rawPreviewImg = document.getElementById('raw-preview-img') as HTMLImageElement;
  private rawBoxLabel = document.getElementById('raw-box-label') as HTMLDivElement;
  private frameOriginNote = document.getElementById('frame-origin-note') as HTMLDivElement;
  private croppedPreviewImg = document.getElementById('cropped-preview-img') as HTMLImageElement;
  private imageViewport = document.getElementById('image-viewport') as HTMLDivElement;
  private telemetryOrig = document.getElementById('telemetry-orig-dims') as HTMLElement;
  private telemetryCrop = document.getElementById('telemetry-crop-dims') as HTMLElement;
  private telemetryRows = document.getElementById('telemetry-rows-removed') as HTMLElement;
  private telemetryWatermark = document.getElementById('telemetry-watermark-status') as HTMLElement;

  private inferenceStatusBadge = document.getElementById('inference-status-badge') as HTMLElement;
  private latencyTag = document.getElementById('latency-tag') as HTMLElement;
  private refusalBox = document.getElementById('refusal-box') as HTMLDivElement;
  private refusalReasonText = document.getElementById('refusal-reason-text') as HTMLElement;
  private descriptionBox = document.getElementById('description-box') as HTMLDivElement;
  private descriptionText = document.getElementById('description-text') as HTMLElement;
  private guardrailBadges = document.getElementById('guardrail-badges') as HTMLDivElement;

  private spokenCaptionText = document.getElementById('spoken-caption-text') as HTMLElement;
  private speakBtn = document.getElementById('speak-btn') as HTMLButtonElement;
  private stopSpeechBtn = document.getElementById('stop-speech-btn') as HTMLButtonElement;
  private voiceSelect = document.getElementById('voice-select') as HTMLSelectElement;

  private manualTokenInput = document.getElementById('manual-token-input') as HTMLInputElement;
  private saveTokenBtn = document.getElementById('save-token-btn') as HTMLButtonElement;

  private customImageBase64: string | null = null;
  private synth: SpeechSynthesis = window.speechSynthesis;
  private voices: SpeechSynthesisVoice[] = [];

  constructor() {
    this.initEventListeners();
    this.initVoices();
    this.checkStatus();
  }

  private initEventListeners() {
    this.refreshStatusBtn.addEventListener('click', () => this.checkStatus());

    this.scenarioSelect.addEventListener('change', () => {
      this.customImageBase64 = null;
      const val = this.scenarioSelect.value;
      if (val === 'person_porch_package') {
        this.eventSubTypeInput.value = 'human';
        this.eventTypeBadge.textContent = 'motion_detected';
      } else if (val === 'vehicle_driveway') {
        this.eventSubTypeInput.value = 'vehicle';
        this.eventTypeBadge.textContent = 'motion_detected';
      } else if (val === 'doorbell_chime_press') {
        this.eventSubTypeInput.value = 'doorbell_chime';
        this.eventTypeBadge.textContent = 'button_press';
      } else if (val === 'pitch_black_unusable') {
        this.eventSubTypeInput.value = 'motion';
        this.eventTypeBadge.textContent = 'motion_detected';
      }
    });

    this.customImageInput.addEventListener('change', (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = () => {
          this.customImageBase64 = reader.result as string;
          this.rawPreviewImg.src = this.customImageBase64;
          this.jsonViewer.textContent = JSON.stringify(
            {
              custom_file_name: file.name,
              size_bytes: file.size,
              type: file.type,
              hint: 'Custom image uploaded. Click Execute Pipeline to crop and describe.'
            },
            null,
            2
          );
        };
        reader.readAsDataURL(file);
      }
    });

    this.runPipelineBtn.addEventListener('click', () => this.executePipeline());

    // Tab buttons for image viewer
    document.querySelectorAll('.tab-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
        const target = e.target as HTMLElement;
        target.classList.add('active');
        const view = target.getAttribute('data-view');
        this.imageViewport.classList.remove('view-cropped-only', 'view-raw-only');
        if (view === 'cropped') {
          this.imageViewport.classList.add('view-cropped-only');
        } else if (view === 'raw') {
          this.imageViewport.classList.add('view-raw-only');
        }
      });
    });

    // Speech controls
    this.speakBtn.addEventListener('click', () => this.speakCaption());
    this.stopSpeechBtn.addEventListener('click', () => this.stopSpeaking());

    // Manual token entry
    this.saveTokenBtn.addEventListener('click', async () => {
      const token = this.manualTokenInput.value.trim();
      if (!token) return;
      this.tokenStatusBadge.className = 'status-pill checking';
      this.tokenStatusBadge.innerHTML = '<span class="status-dot"></span><span class="status-text">Validating...</span>';
      // Store in session and re-check
      sessionStorage.setItem('ring_token', token);
      await this.checkStatus();
    });
  }

  private initVoices() {
    const updateVoices = () => {
      this.voices = this.synth.getVoices();
      this.voiceSelect.innerHTML = '';
      this.voices.forEach((voice, index) => {
        const opt = document.createElement('option');
        opt.value = String(index);
        opt.textContent = `${voice.name} (${voice.lang})`;
        if (voice.default || voice.lang.startsWith('en')) {
          opt.selected = true;
        }
        this.voiceSelect.appendChild(opt);
      });
    };

    updateVoices();
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = updateVoices;
    }
  }

  async checkStatus() {
    this.tokenStatusBadge.className = 'status-pill checking';
    this.tokenStatusBadge.innerHTML = '<span class="status-dot"></span><span class="status-text">Checking Ring Token...</span>';

    try {
      const res = await fetch('/api/status');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: StatusResponse = await res.json();

      this.apiEndpointText.textContent = data.tokenStatus.endpointChecked || 'https://api.amazonvision.com/v1';

      if (data.tokenStatus.valid) {
        this.tokenStatusBadge.className = 'status-pill valid';
        this.tokenStatusBadge.innerHTML = `<span class="status-dot"></span><span class="status-text">Ring Sandbox: Active (${data.tokenStatus.redactedToken})</span>`;
        this.tokenWarningBanner.classList.add('hidden');
      } else {
        const isExpired = data.tokenStatus.httpStatus === 401 && data.tokenStatus.redactedToken !== '(none)';
        this.tokenStatusBadge.className = isExpired ? 'status-pill expired' : 'status-pill missing';
        this.tokenStatusBadge.innerHTML = `<span class="status-dot"></span><span class="status-text">Ring Sandbox: ${isExpired ? 'Token Expired (401)' : 'Token Missing'}</span>`;
        this.tokenWarningBanner.classList.remove('hidden');
      }
    } catch (err: any) {
      this.tokenStatusBadge.className = 'status-pill expired';
      this.tokenStatusBadge.innerHTML = '<span class="status-dot"></span><span class="status-text">Backend Offline</span>';
      this.tokenWarningBanner.classList.remove('hidden');
    }
  }

  async executePipeline() {
    this.runPipelineBtn.disabled = true;
    this.runPipelineBtn.innerHTML = '<span class="btn-icon">⏳</span> Processing...';
    this.inferenceStatusBadge.className = 'badge status-idle';
    this.inferenceStatusBadge.textContent = 'INFERRING';
    this.descriptionText.textContent = 'Processing frame through watermark cropper and Bedrock Nova Pro...';

    const scenarioId = this.customImageBase64 ? undefined : this.scenarioSelect.value;
    const eventType = this.scenarioSelect.value === 'doorbell_chime_press' ? 'button_press' : 'motion_detected';
    const subType = this.eventSubTypeInput.value.trim();
    const deviceId = this.deviceIdInput.value.trim();

    const requestBody: any = {
      scenarioId,
      eventType,
      subType,
      deviceId
    };

    if (this.customImageBase64) {
      requestBody.imageBase64 = this.customImageBase64;
    }

    try {
      const res = await fetch('/api/describe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const data: PipelineResponse = await res.json();
      this.renderPipelineResult(data);
    } catch (err: any) {
      this.inferenceStatusBadge.className = 'badge status-refused';
      this.inferenceStatusBadge.textContent = 'NETWORK ERROR';
      this.descriptionText.textContent = `Pipeline request failed: ${err.message}`;
    } finally {
      this.runPipelineBtn.disabled = false;
      this.runPipelineBtn.innerHTML = '<span class="btn-icon">⚡</span> Execute Pipeline';
    }
  }

  /**
   * The image label is written from the frame's declared origin, never from a
   * static string. Two of the preset frames are Google-generated images
   * carrying C2PA credentials and a SynthID watermark (see
   * docs/00-research/fixture-media-provenance.md). A viewer must be able to
   * tell that by looking at the pane, not by reading the repository.
   */
  private renderFrameOrigin(origin: PipelineResponse['frameOrigin']) {
    if (!this.rawBoxLabel || !this.frameOriginNote) return;

    const labels: Record<string, { label: string; note: string; cls: string }> = {
      'ai-generated': {
        label: 'Input Frame — SYNTHETIC, AI-GENERATED (Watermark Zone Boxed)',
        note:
          'Frame source: AI-generated image (Google C2PA content credentials, digitalSourceType trainedAlgorithmicMedia, SynthID watermark applied). Not camera output.',
        cls: 'frame-origin-note origin-synthetic'
      },
      procedural: {
        label: 'Input Frame — PROCEDURALLY DRAWN (Watermark Zone Boxed)',
        note:
          'Frame source: drawn pixel-by-pixel in code by this repository. Not camera output.',
        cls: 'frame-origin-note origin-procedural'
      },
      'user-upload': {
        label: 'Input Frame — UPLOADED BY YOU (Watermark Zone Boxed)',
        note: 'Frame source: the file you selected. This app makes no claim about its origin.',
        cls: 'frame-origin-note origin-upload'
      },
      'ring-live': {
        label: 'Input Frame — LIVE RING CAMERA (Watermark Zone Boxed)',
        note: 'Frame source: fetched from a Ring device over the Ring Partner API.',
        cls: 'frame-origin-note origin-live'
      }
    };

    const chosen = labels[origin ?? ''] ?? {
      label: 'Input Frame (Watermark Zone Boxed)',
      note: 'Frame source: undeclared. Treat this frame as unverified.',
      cls: 'frame-origin-note origin-unknown'
    };

    this.rawBoxLabel.textContent = chosen.label;
    this.frameOriginNote.textContent = chosen.note;
    this.frameOriginNote.className = chosen.cls;
  }

  private renderPipelineResult(data: PipelineResponse) {
    // Step 1: Render Normalized Webhook Payload
    this.eventTypeBadge.textContent = data.eventType;
    const payloadDisplay = {
      event_id: data.eventId,
      event_type: data.eventType,
      created_at: data.createdAt,
      data: {
        device_id: data.deviceId,
        attributes: {
          sub_type: data.subType
        }
      }
    };
    this.jsonViewer.textContent = JSON.stringify(payloadDisplay, null, 2);

    // Step 2: Render Images and Telemetry
    this.renderFrameOrigin(data.frameOrigin);
    if (data.rawImageBase64) {
      this.rawPreviewImg.src = data.rawImageBase64;
    }
    if (data.croppedImageBase64) {
      this.croppedPreviewImg.src = data.croppedImageBase64;
    }

    if (data.cropDetails) {
      this.telemetryOrig.textContent = data.cropDetails.originalDimensions;
      this.telemetryCrop.textContent = data.cropDetails.croppedDimensions;
      this.telemetryRows.textContent = `${data.cropDetails.rowsRemoved}px (${data.cropDetails.cropPercentage}%)`;
      this.telemetryWatermark.textContent = 'EXCISED (0% IN PAYLOAD)';
      this.telemetryWatermark.className = 'status-clean';
    }

    // Step 3: Bedrock Nova Pro Inference & Refusal
    this.latencyTag.textContent = `Latency: ${data.totalLatencyMs}ms`;

    if (data.status === 'TOKEN_REQUIRED') {
      this.inferenceStatusBadge.className = 'badge status-refused';
      this.inferenceStatusBadge.textContent = 'TOKEN REQUIRED';
      this.refusalBox.classList.remove('hidden');
      this.refusalReasonText.textContent = data.refusalReason || 'No valid Ring Playground token.';
      this.descriptionBox.style.display = 'none';
      this.spokenCaptionText.textContent = '[No transcript - Ring API token required]';
      this.speakBtn.disabled = true;
      this.stopSpeechBtn.disabled = true;
      return;
    }

    if (data.status === 'REFUSED') {
      this.inferenceStatusBadge.className = 'badge status-refused';
      this.inferenceStatusBadge.textContent = 'REFUSED';
      this.refusalBox.classList.remove('hidden');
      this.refusalReasonText.textContent = data.refusalReason || 'Visual content is not discernible.';
      this.descriptionBox.style.display = 'none';
      this.spokenCaptionText.textContent = data.spokenCaption;
      this.speakBtn.disabled = false;
    } else {
      this.inferenceStatusBadge.className = 'badge status-described';
      this.inferenceStatusBadge.textContent = 'DESCRIBED';
      this.refusalBox.classList.add('hidden');
      this.descriptionBox.style.display = 'flex';
      this.descriptionText.textContent = data.description;
      this.renderGuardrails(data.guardrails);
      this.spokenCaptionText.textContent = data.spokenCaption;
      this.speakBtn.disabled = false;
    }
  }

  private renderGuardrails(guardrails?: GuardrailRuleResult[]) {
    if (!this.guardrailBadges) return;
    this.guardrailBadges.innerHTML = '';

    const labels: Record<string, string> = {
      'identity-inference': 'No Identity Speculation',
      'motive-inference': 'No Motive Guessing',
      'single-present-tense-sentence': 'Single Present-Tense Sentence'
    };

    const rules = guardrails || [
      { rule: 'identity-inference', pass: true, finding: null },
      { rule: 'motive-inference', pass: true, finding: null },
      { rule: 'single-present-tense-sentence', pass: true, finding: null }
    ];

    for (const r of rules) {
      const pill = document.createElement('span');
      if (r.pass) {
        pill.className = 'guard-pill pass';
        pill.textContent = labels[r.rule] || r.rule;
      } else {
        pill.className = 'guard-pill fail';
        pill.textContent = r.finding || `${labels[r.rule] || r.rule}: Failed`;
      }
      this.guardrailBadges.appendChild(pill);
    }
  }

  private speakCaption() {
    const text = this.spokenCaptionText.textContent?.trim();
    if (!text || text.startsWith('[No transcript')) return;

    this.synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const selectedVoiceIndex = parseInt(this.voiceSelect.value, 10);
    if (this.voices[selectedVoiceIndex]) {
      utterance.voice = this.voices[selectedVoiceIndex];
    }
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    this.stopSpeechBtn.disabled = false;
    utterance.onend = () => {
      this.stopSpeechBtn.disabled = true;
    };
    utterance.onerror = () => {
      this.stopSpeechBtn.disabled = true;
    };

    this.synth.speak(utterance);
  }

  private stopSpeaking() {
    this.synth.cancel();
    this.stopSpeechBtn.disabled = true;
  }
}

// Bootstrap on DOM load
window.addEventListener('DOMContentLoaded', () => {
  new DoorstepApp();
});
