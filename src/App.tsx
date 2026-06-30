import {
  AlertTriangle,
  ArrowUpRight,
  Camera,
  CheckCircle2,
  ExternalLink,
  ImagePlus,
  Loader2,
  LocateFixed,
  RadioTower,
  ShieldCheck,
  Upload,
  X,
} from "lucide-react";
import * as tmImage from "@teachablemachine/image";
import { ChangeEvent, DragEvent, useEffect, useMemo, useRef, useState } from "react";

type Prediction = {
  className: string;
  probability: number;
};

type Model = Awaited<ReturnType<typeof tmImage.load>>;

const MODEL_URL = "/tm-my-image-model/";
const HERO_VIDEO_URL =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260328_083109_283f3553-e28f-428b-a723-d639c617eb2b.mp4";
const CLASSES = [
  "Elephant",
  "Crocodiles",
  "Monkeys",
  "Wild Boars",
  "Indian Leopard",
  "Indian Wolves",
  "Asiatic Black Bears",
];

const TEAM = [
  { name: "Dilsha", role: "CEO" },
  { name: "Pranjal", role: "Chief Operating Officer" },
  { name: "Daya", role: "Chief Marketing Officer" },
  { name: "Amaliya", role: "Chief Marketing Officer" },
  { name: "Augustine", role: "Chief Technical Officer" },
  { name: "Aysha", role: "Document Writer" },
];

const riskCopy: Record<string, string> = {
  Elephant: "Herd movement near crop edges or village roads.",
  Crocodiles: "Waterbody crossing risk around riverbanks and canals.",
  Monkeys: "Fast-moving troop activity around homes and storage areas.",
  "Wild Boars": "Night crop-raiding and sudden road-crossing alerts.",
  "Indian Leopard": "High-priority predator presence near settlement borders.",
  "Indian Wolves": "Pack movement detection across open scrubland.",
  "Asiatic Black Bears": "Forest-fringe activity requiring distance warnings.",
};

function App() {
  const [model, setModel] = useState<Model | null>(null);
  const [modelState, setModelState] = useState<"loading" | "ready" | "error">("loading");
  const [imageSrc, setImageSrc] = useState<string>("");
  const [imageName, setImageName] = useState<string>("No image selected");
  const [imageUrl, setImageUrl] = useState<string>("");
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [isPredicting, setIsPredicting] = useState(false);
  const [message, setMessage] = useState("Upload a Google image to begin.");
  const [dragActive, setDragActive] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const heroVideoRef = useRef<HTMLVideoElement>(null);
  const [heroVideoOpacity, setHeroVideoOpacity] = useState(0);

  useEffect(() => {
    let mounted = true;

    async function loadModel() {
      try {
        const loadedModel = await tmImage.load(
          `${MODEL_URL}model.json`,
          `${MODEL_URL}metadata.json`
        );
        if (!mounted) {
          return;
        }
        setModel(loadedModel);
        setModelState("ready");
        setMessage("Model ready. Choose an animal image from Google and upload it.");
      } catch {
        if (!mounted) {
          return;
        }
        setModelState("error");
        setMessage("Model could not load. Start the Vite server so model files are served.");
      }
    }

    loadModel();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const video = heroVideoRef.current;
    if (!video) {
      return;
    }

    let frameId = 0;
    let endTimer: number | undefined;

    const monitorLoop = () => {
      if (video.duration && Number.isFinite(video.duration)) {
        if (video.currentTime < 0.5) {
          setHeroVideoOpacity(Math.min(video.currentTime / 0.5, 1));
        } else if (video.duration - video.currentTime < 0.5) {
          setHeroVideoOpacity(Math.max((video.duration - video.currentTime) / 0.5, 0));
        } else {
          setHeroVideoOpacity(1);
        }
      }
      frameId = window.requestAnimationFrame(monitorLoop);
    };

    const handleEnded = () => {
      setHeroVideoOpacity(0);
      endTimer = window.setTimeout(() => {
        video.currentTime = 0;
        void video.play();
      }, 100);
    };

    video.addEventListener("ended", handleEnded);
    void video.play();
    frameId = window.requestAnimationFrame(monitorLoop);

    return () => {
      window.cancelAnimationFrame(frameId);
      if (endTimer) {
        window.clearTimeout(endTimer);
      }
      video.removeEventListener("ended", handleEnded);
    };
  }, []);

  const topPrediction = useMemo(() => {
    return [...predictions].sort((a, b) => b.probability - a.probability)[0];
  }, [predictions]);

  const confidence = topPrediction ? Math.round(topPrediction.probability * 100) : 0;

  async function runPrediction() {
    if (!model || !imageRef.current) {
      return;
    }

    setIsPredicting(true);
    setMessage("Scanning image through WildEye AI...");
    try {
      const result = await model.predict(imageRef.current);
      const sorted = result.sort((a, b) => b.probability - a.probability);
      setPredictions(sorted);
      setMessage(`Detected ${sorted[0].className} with ${Math.round(sorted[0].probability * 100)}% confidence.`);
    } catch {
      setMessage("This image could not be read. Try uploading the downloaded file instead.");
    } finally {
      setIsPredicting(false);
    }
  }

  function loadFile(file?: File) {
    if (!file || !file.type.startsWith("image/")) {
      setMessage("Please select a valid image file.");
      return;
    }

    const src = URL.createObjectURL(file);
    setImageSrc(src);
    setImageName(file.name);
    setPredictions([]);
    setMessage("Image loaded. Running classification...");
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    loadFile(event.target.files?.[0]);
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragActive(false);
    loadFile(event.dataTransfer.files?.[0]);
  }

  function onDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragActive(true);
  }

  function onUrlLoad() {
    if (!imageUrl.trim()) {
      return;
    }
    setImageSrc(imageUrl.trim());
    setImageName("Google image URL");
    setPredictions([]);
    setMessage("URL loaded. If the host allows image access, classification will run.");
  }

  return (
    <main className="app-shell">
      <nav className="nav-bar">
        <a className="brand" href="#top" aria-label="WildEye home">
          <span>WildEye<sup>®</sup></span>
        </a>
        <div className="nav-links" aria-label="Primary navigation">
          <a href="#top">Home</a>
          <a href="#demo">Studio</a>
          <a href="#coverage">About</a>
          <a href="#team">Journal</a>
          <a href="#tower">Reach Us</a>
        </div>
        <a className="nav-cta" href="#demo">
          Begin Journey
        </a>
      </nav>

      <section className="hero-section" id="top">
        <div className="hero-media" aria-hidden="true">
          <video
            ref={heroVideoRef}
            src={HERO_VIDEO_URL}
            muted
            playsInline
            preload="auto"
            style={{ opacity: heroVideoOpacity }}
          />
          <div className="hero-gradient" />
        </div>

        <h1 className="hero-title animate-fade-rise">
          Beyond warning, we build <em>safer villages.</em>
        </h1>
        
        <div className="hero-actions animate-fade-rise-delay-2">
          <a className="primary-button" href="#demo">
            Begin Journey
          </a>
        </div>
      </section>

      <section className="demo-section" id="demo">
        <div className="section-heading">
          <p>Judge-ready classifier</p>
          <h2>Choose any wildlife image, upload it, and see the detected class instantly.</h2>
        </div>

        <div className="demo-grid">
          <div
            className={`upload-panel ${dragActive ? "is-dragging" : ""}`}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={() => setDragActive(false)}
          >
            <div className="panel-topline">
              <span>
                {modelState === "ready" && <CheckCircle2 size={16} />}
                {modelState === "loading" && <Loader2 className="spin" size={16} />}
                {modelState === "error" && <AlertTriangle size={16} />}
                {modelState === "ready" ? "Model online" : modelState === "loading" ? "Loading model" : "Model error"}
              </span>
              <span>Teachable Machine</span>
            </div>

            <button className="drop-zone" type="button" onClick={() => fileInputRef.current?.click()}>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={onFileChange} />
              <ImagePlus size={36} />
              <strong>Drop a Google image here</strong>
              <span>or click to upload a downloaded wildlife photo</span>
            </button>

            <div className="url-row">
              <input
                value={imageUrl}
                onChange={(event) => setImageUrl(event.target.value)}
                placeholder="Paste image URL when allowed by the source"
                aria-label="Image URL"
              />
              <button type="button" onClick={onUrlLoad}>
                Load URL
              </button>
            </div>

            <div className="image-stage">
              {imageSrc ? (
                <>
                  <button
                    className="clear-button"
                    type="button"
                    aria-label="Clear image"
                    onClick={() => {
                      setImageSrc("");
                      setImageName("No image selected");
                      setPredictions([]);
                      setMessage("Upload a Google image to begin.");
                    }}
                  >
                    <X size={16} />
                  </button>
                  <img
                    ref={imageRef}
                    src={imageSrc}
                    alt="Selected wildlife"
                    crossOrigin="anonymous"
                    onLoad={runPrediction}
                  />
                </>
              ) : (
                <div className="empty-stage">
                  <Camera size={34} />
                  <span>Awaiting image upload</span>
                </div>
              )}
            </div>
            <p className="status-line">{message}</p>
            <p className="file-name">{imageName}</p>
          </div>

          <aside className="result-panel">
            <div className="result-header">
              <span>Classification</span>
              {isPredicting ? <Loader2 className="spin" size={18} /> : <ShieldCheck size={18} />}
            </div>

            <div className="verdict">
              <span className="verdict-label">Detected class</span>
              <strong>{topPrediction?.className ?? "Waiting for image"}</strong>
              <div className="confidence-ring" style={{ "--score": `${confidence}%` } as React.CSSProperties}>
                <span>{confidence}%</span>
              </div>
              <p>{topPrediction ? riskCopy[topPrediction.className] : "Upload an image to activate the village safety scan."}</p>
            </div>

            <div className="prediction-list">
              {(predictions.length ? predictions : CLASSES.map((className) => ({ className, probability: 0 }))).map(
                (prediction) => (
                  <div className="prediction-row" key={prediction.className}>
                    <div>
                      <span>{prediction.className}</span>
                      <small>{Math.round(prediction.probability * 100)}%</small>
                    </div>
                    <div className="bar-track">
                      <span style={{ width: `${Math.round(prediction.probability * 100)}%` }} />
                    </div>
                  </div>
                )
              )}
            </div>
          </aside>
        </div>
      </section>

      <section className="coverage-section" id="coverage">
        <div className="section-heading">
          <p>Recognition coverage</p>
          <h2>Seven high-impact animal classes for forest-fringe communities.</h2>
        </div>
        <div className="animal-grid">
          {CLASSES.map((animal) => (
            <article className="animal-card" key={animal}>
              <span>{animal}</span>
              <p>{riskCopy[animal]}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="field-image-section" aria-label="WildEye visual concept">
        <img src="/logo/image.png" alt="WildEye animal detection concept" />
      </section>

      <section className="team-section" id="team">
        <div className="section-heading">
          <p>WildEye team</p>
          <h2>The people bringing the village safety sentinel to life.</h2>
        </div>
        <div className="team-grid">
          {TEAM.map((member) => (
            <article className="team-card" key={`${member.name}-${member.role}`}>
              <div className="team-initials" aria-hidden="true">
                {member.name.slice(0, 2).toUpperCase()}
              </div>
              <span>{member.role}</span>
              <strong>{member.name}</strong>
            </article>
          ))}
        </div>
      </section>

      <section className="tower-section" id="tower">
        <div>
          <p className="section-label">Field concept</p>
          <h2>A calm 7m watchtower that turns vision into warning time.</h2>
        </div>
        <div className="tower-points">
          <span>
            <LocateFixed size={18} />
            Elevated line of sight
          </span>
          <span>
            <RadioTower size={18} />
            Steel pole deployment
          </span>
          <span>
            <ShieldCheck size={18} />
            Early village alerts
          </span>
        </div>
      </section>
    </main>
  );
}

export default App;
