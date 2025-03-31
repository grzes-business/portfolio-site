export interface TechBubble {
  name: string;
  icon: string;
  description: string;
  proficiency: number;
  experience: string;
  usage: string[];
}

interface BubbleNode {
  element: HTMLElement;
  iconElement: HTMLElement;
  textElement: HTMLElement;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  tech: TechBubble;
  baseX: number;
  baseY: number;
  floatOffset: number;
}

export class BubbleLayout {
  private nodes: BubbleNode[] = [];
  private container: HTMLElement;
  private width: number;
  private height: number;
  private centerX: number;
  private centerY: number;
  private isRunning: boolean = false;
  private responsivenessCoefficient: number;

  constructor(containerId: string, private technologies: TechBubble[]) {
    const containerElement = document.getElementById(containerId);
    if (!containerElement) throw new Error("Container element not found");
    this.container = containerElement;

    // Make sure the container has proper CSS for positioning
    this.container.style.position = "relative";
    // this.container.style.overflow = 'hidden'; // Keep bubbles inside

    // Initialize dimensions & center
    const rect = this.container.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;
    this.centerX = this.width / 2;
    this.centerY = this.height / 2;

    // Validate the height - make sure it's non-zero
    if (this.height < 10) {
      console.warn("Container height is very small, setting to default 400px");
      this.container.style.height = "400px";
      this.height = 400;
      this.centerY = 200;
    }

    console.log(
      `Container width: ${this.width}px, height: ${this.height}px`,
      "Gravitational center:",
      this.centerX,
      this.centerY
    );

    // Set responsiveness based on container height
    // Calculate responsiveness coefficient based on container width
    // Map width from 320-1200px range to 0.3-1.0 coefficient range
    const minWidth = 320;
    const breakpointWidth = 600;
    const maxWidth = 1200;
    const minCoef = 0.3;
    const midCoef = 0.5; // Coefficient at the breakpoint
    const maxCoef = 0.8;

    // Clamp width to our min/max range
    const clampedWidth = Math.max(minWidth, Math.min(maxWidth, this.width));

    let coefficient;
    if (clampedWidth <= breakpointWidth) {
      // Logarithmic scaling for smaller screens
      // Using log base 10 for a more gentle curve
      const normalizedPosition =
        (clampedWidth - minWidth) / (breakpointWidth - minWidth);
      const logFactor = Math.log10(1 + 9 * normalizedPosition) / Math.log10(10);
      coefficient = minCoef + logFactor * (midCoef - minCoef);
    } else {
      // Linear scaling for larger screens
      const normalizedPosition =
        (clampedWidth - breakpointWidth) / (maxWidth - breakpointWidth);
      coefficient = midCoef + normalizedPosition * (maxCoef - midCoef);
    }

    // Round to 2 decimal places for readability
    this.responsivenessCoefficient = Math.round(coefficient * 100) / 100;

    console.log(
      `Responsiveness coefficient: ${this.responsivenessCoefficient} (width: ${this.width}px)`
    );

    this.initialize();
    this.setupResizeListener();
    this.setupIntersectionObserver();
  }

  private initialize(): void {
    // Clear existing bubbles
    this.container.innerHTML = "";

    // Add a visual indicator of the center (helpful for debugging)
    // const centerMarker = document.createElement('div');
    // centerMarker.classList.add('center-marker');
    // centerMarker.style.position = 'absolute';
    // centerMarker.style.width = '10px';
    // centerMarker.style.height = '10px';
    // centerMarker.style.borderRadius = '50%';
    // centerMarker.style.backgroundColor = 'rgba(255,0,0,0.5)';
    // centerMarker.style.transform = `translate(${this.centerX - 5}px, ${this.centerY - 5}px)`;
    // centerMarker.style.pointerEvents = 'none'; // Don't interfere with clicks
    // centerMarker.style.zIndex = '100';
    // this.container.appendChild(centerMarker);

    // Create bubble elements
    this.nodes = this.technologies.map((tech, index) => {
      // Create main bubble container
      const bubble = document.createElement("div");
      bubble.className =
        "tech-bubble cursor-pointer top-0 left-0 absolute translate-x-0 translate-y-0 flex flex-col items-center justify-center";
      bubble.dataset.techIndex = index.toString();

      // Create icon container with size based on proficiency (softer difference)
      const iconContainer = document.createElement("div");
      // Base size + smaller variation for proficiency
      const iconSize = 40 + 15 * tech.proficiency;
      iconContainer.className = `rounded-full bg-zinc-800/50 backdrop-blur-sm flex items-center justify-center p-3 hover:scale-110 transition-transform`;
      iconContainer.style.width = `${iconSize}px`;
      iconContainer.style.height = `${iconSize}px`;

      // Get the icon SVG from the SEPARATE preload container
      const iconElement = document.createElement("div");
      // Make the icon size proportional to the container size
      const innerIconSize = iconSize * 0.6; // 60% of container size
      iconElement.className = `text-white flex items-center justify-center`;
      iconElement.style.width = `${innerIconSize}px`;
      iconElement.style.height = `${innerIconSize}px`;

      // Find the preloaded icon in the separate container
      const preloadedIconContainer = document.querySelector(
        `#tech-icons-preload [data-tech-icon="${tech.icon}"]`
      );
      let svgIcon = null;

      if (preloadedIconContainer) {
        const svg = preloadedIconContainer.querySelector("svg");
        if (svg) {
          svgIcon = svg.cloneNode(true);
          // Properly size the SVG to fit in the container
          (svgIcon as SVGElement).setAttribute("width", "100%");
          (svgIcon as SVGElement).setAttribute("height", "100%");
          (svgIcon as SVGElement).style.width = "100%";
          (svgIcon as SVGElement).style.height = "100%";
          // Remove any fixed dimensions that might override our sizing
          (svgIcon as SVGElement).removeAttribute("viewBox");
          (svgIcon as SVGElement).setAttribute(
            "preserveAspectRatio",
            "xMidYMid meet"
          );
        }
      }

      if (svgIcon) {
        iconElement.appendChild(svgIcon);
      } else {
        // Fallback if icon not found
        console.warn(`Icon not found for ${tech.name}`);
        const fallbackText = document.createElement("div");
        fallbackText.textContent = tech.name.substring(0, 2).toUpperCase();
        fallbackText.className = "text-lg font-bold";
        iconElement.appendChild(fallbackText);
      }

      iconContainer.appendChild(iconElement);
      bubble.appendChild(iconContainer);

      // Create text element below the bubble
      const text = document.createElement("div");
      text.className = "text-sm text-zinc-400 mt-2 text-center";
      text.textContent = tech.name;
      bubble.appendChild(text);

      this.container.appendChild(bubble);

      // Initial random position with a wider spread
      return {
        element: bubble,
        iconElement,
        textElement: text,
        x: this.centerX + (Math.random() - 0.5) * this.width * 0.6,
        y: this.centerY + (Math.random() - 0.5) * this.height * 0.6,
        vx: 0,
        vy: 0,
        // Soften the size difference by using a smaller multiplier for proficiency
        // Use a base size + a smaller variation based on proficiency
        radius: (40 + 20 * tech.proficiency) * this.responsivenessCoefficient,
        tech,
        baseX: 0,
        baseY: 0,
        floatOffset: Math.random() * Math.PI * 2,
      };
    });

    this.isRunning = true;
    this.animate();
    this.updateSizes();
  }

  private showModal(tech: TechBubble): void {
    // This will use the existing modal functionality in your Skills.astro component
    // The click event will be handled by the DOM event listeners already in place
  }

  private updateSizes(): void {
    this.nodes.forEach((node) => {
      const bubbleSize = node.radius * 2;
      const iconContainerSize = bubbleSize * 0.8; // 80% of bubble size
      const iconSize = iconContainerSize * 0.6; // 60% of container size

      // Update sizes
      node.element.style.width = `${bubbleSize}px`;

      // Find the icon container and update its size
      const iconContainer = node.element.querySelector("div");
      if (iconContainer) {
        (iconContainer as HTMLElement).style.width = `${iconContainerSize}px`;
        (iconContainer as HTMLElement).style.height = `${iconContainerSize}px`;

        // Find the icon element and update its size
        const iconElement = iconContainer.querySelector("div");
        if (iconElement) {
          (iconElement as HTMLElement).style.width = `${iconSize}px`;
          (iconElement as HTMLElement).style.height = `${iconSize}px`;
        }
      }
    });
  }

  private animate(): void {
    if (!this.isRunning) return;
    const currentTime = Date.now() / 1000; // Time in seconds

    this.nodes.forEach((node) => {
      // Apply gravitational pull toward the center
      const dx = this.centerX - node.x;
      const dy = this.centerY - node.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance > 0) {
        // Apply stronger gravity as distance increases (non-linear)
        const gravitationalForce = 0.2 * Math.min(1.0, distance / 100);
        node.vx += (dx / distance) * gravitationalForce;
        node.vy += (dy / distance) * gravitationalForce;
      }

      // Add gentle floating motion
      const floatAmplitude = 0.8;
      const floatFrequency = 0.5;
      const floatX =
        Math.sin(currentTime * floatFrequency + node.floatOffset) *
        floatAmplitude;
      const floatY =
        Math.cos(currentTime * floatFrequency + node.floatOffset) *
        floatAmplitude;

      // Update position with velocity and floating motion
      node.x += node.vx + floatX * 0.1;
      node.y += node.vy + floatY * 0.1;

      // PRIORITY 1: Container boundary enforcement - with padding to account for bubble radius
      const padding = node.radius;

      // Apply horizontal boundary constraints - with stronger bounce effect
      if (node.x < padding) {
        node.x = padding + 2; // Add a small buffer to prevent sticking to edge
        node.vx = Math.abs(node.vx) * 0.8; // Stronger bounce
      } else if (node.x > this.width - padding) {
        node.x = this.width - padding - 2; // Add a small buffer
        node.vx = -Math.abs(node.vx) * 0.8; // Stronger bounce
      }

      // Apply vertical boundary constraints - with stronger bounce effect
      if (node.y < padding) {
        node.y = padding + 2; // Add a small buffer
        node.vy = Math.abs(node.vy) * 0.8; // Stronger bounce
      } else if (node.y > this.height - padding) {
        node.y = this.height - padding - 2; // Add a small buffer
        node.vy = -Math.abs(node.vy) * 0.8; // Stronger bounce
      }

      // PRIORITY 2: Apply collision resolution after enforcing boundaries
      this.nodes.forEach((other) => {
        if (node === other) return;
        const dx = other.x - node.x;
        const dy = other.y - node.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const minDistance = (node.radius + other.radius) * 1.5;

        if (distance < minDistance && distance > 0) {
          const angle = Math.atan2(dy, dx);
          const force = (minDistance - distance) * 0.1;

          // Apply force proportional to the overlap
          node.vx -= Math.cos(angle) * force;
          node.vy -= Math.sin(angle) * force;
        }
      });

      // Apply damping - higher values (closer to 1) = less damping
      // Lower values = more damping
      node.vx *= 0.2;
      node.vy *= 0.2;

      // Update bubble position with smooth transition
      node.element.style.transition = "transform 0.1s ease-out";
      node.element.style.transform = `translate(${node.x - node.radius}px, ${
        node.y - node.radius
      }px)`;
    });

    requestAnimationFrame(() => this.animate());
  }

  private setupResizeListener(): void {
    let resizeTimeout: number | undefined;

    window.addEventListener("resize", () => {
      if (resizeTimeout) {
        window.clearTimeout(resizeTimeout);
      }

      resizeTimeout = window.setTimeout(() => {
        const rect = this.container.getBoundingClientRect();
        this.width = rect.width;
        this.height = rect.height;
        this.centerX = this.width / 2;
        this.centerY = this.height / 2;
      }, 100);
    });
  }

  private setupIntersectionObserver(): void {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // As soon as 10% is visible, add a class or trigger your animations
            this.container.classList.add("active");
            // Ensure animations are running
            if (!this.isRunning) {
              this.isRunning = true;
              this.animate();
            }
          } else {
            // Optionally, pause animations when not visible
            this.container.classList.remove("active");
          }
        });
      },
      { threshold: 0.1 }
    ); // 10% of the container in view is enough
    observer.observe(this.container);
  }

  public destroy(): void {
    this.isRunning = false;
  }
}
