import { LandingContent, BrandKit } from "./types";

// Generate a complete landing page HTML from brand and content data
export function generateLandingPage(brand: BrandKit, content: LandingContent): string {
    const { name, tagline, colors, fonts } = brand;
    const { hero, features, benefits, faq, footer } = content;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${name} - ${tagline}</title>
  <meta name="description" content="${hero.subheadline}">
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Outfit:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    :root {
      --primary: ${colors.primary};
      --secondary: ${colors.secondary};
      --accent: ${colors.accent};
      --background: ${colors.background};
      --text: ${colors.text};
      --font-display: '${fonts.heading}', system-ui, sans-serif;
      --font-body: '${fonts.body}', system-ui, sans-serif;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: var(--font-body);
      background: var(--background);
      color: var(--text);
      line-height: 1.6;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 24px;
    }

    /* Header */
    header {
      padding: 20px 0;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: rgba(255,255,255,0.9);
      backdrop-filter: blur(10px);
      z-index: 100;
      border-bottom: 1px solid rgba(0,0,0,0.05);
    }

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .logo {
      font-family: var(--font-display);
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--primary);
      text-decoration: none;
    }

    .nav-cta {
      background: var(--primary);
      color: white;
      padding: 10px 20px;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 500;
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .nav-cta:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }

    /* Hero */
    .hero {
      min-height: 100vh;
      display: flex;
      align-items: center;
      padding-top: 80px;
      background: linear-gradient(135deg, var(--background) 0%, #f8f9fa 100%);
    }

    .hero-content {
      text-align: center;
      max-width: 800px;
      margin: 0 auto;
      padding: 60px 0;
    }

    .hero h1 {
      font-family: var(--font-display);
      font-size: clamp(2.5rem, 5vw, 4rem);
      font-weight: 800;
      line-height: 1.1;
      margin-bottom: 20px;
      background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .hero p {
      font-size: 1.25rem;
      color: #666;
      margin-bottom: 32px;
      max-width: 600px;
      margin-left: auto;
      margin-right: auto;
    }

    .hero-cta {
      display: inline-block;
      background: var(--primary);
      color: white;
      padding: 16px 32px;
      border-radius: 12px;
      text-decoration: none;
      font-weight: 600;
      font-size: 1.1rem;
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .hero-cta:hover {
      transform: translateY(-3px);
      box-shadow: 0 8px 24px rgba(0,0,0,0.2);
    }

    /* Features */
    .features {
      padding: 100px 0;
      background: white;
    }

    .section-title {
      font-family: var(--font-display);
      font-size: 2.5rem;
      font-weight: 700;
      text-align: center;
      margin-bottom: 60px;
    }

    .features-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 32px;
    }

    .feature-card {
      background: #f8f9fa;
      padding: 32px;
      border-radius: 16px;
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .feature-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 32px rgba(0,0,0,0.1);
    }

    .feature-icon {
      font-size: 2.5rem;
      margin-bottom: 16px;
    }

    .feature-card h3 {
      font-family: var(--font-display);
      font-size: 1.25rem;
      font-weight: 600;
      margin-bottom: 8px;
    }

    .feature-card p {
      color: #666;
      font-size: 0.95rem;
    }

    /* Benefits */
    .benefits {
      padding: 80px 0;
      background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%);
      color: white;
    }

    .benefits-list {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 24px;
      list-style: none;
    }

    .benefits-list li {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 1.1rem;
    }

    /* FAQ */
    .faq {
      padding: 100px 0;
      background: white;
    }

    .faq-list {
      max-width: 700px;
      margin: 0 auto;
    }

    .faq-item {
      border-bottom: 1px solid #eee;
      padding: 24px 0;
    }

    .faq-item h4 {
      font-family: var(--font-display);
      font-size: 1.1rem;
      font-weight: 600;
      margin-bottom: 8px;
    }

    .faq-item p {
      color: #666;
    }

    /* Footer */
    footer {
      padding: 40px 0;
      background: var(--text);
      color: white;
      text-align: center;
    }

    footer p {
      opacity: 0.7;
      font-size: 0.9rem;
    }

    /* Waitlist Form */
    .waitlist-section {
      padding: 100px 0;
      background: #f8f9fa;
      text-align: center;
    }

    .waitlist-form {
      max-width: 500px;
      margin: 40px auto 0;
      display: flex;
      gap: 12px;
    }

    .waitlist-form input {
      flex: 1;
      padding: 16px 20px;
      border: 2px solid #e0e0e0;
      border-radius: 12px;
      font-size: 1rem;
      transition: border-color 0.2s;
    }

    .waitlist-form input:focus {
      outline: none;
      border-color: var(--primary);
    }

    .waitlist-form button {
      background: var(--primary);
      color: white;
      padding: 16px 32px;
      border: none;
      border-radius: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.2s;
    }

    .waitlist-form button:hover {
      transform: translateY(-2px);
    }

    @media (max-width: 600px) {
      .waitlist-form {
        flex-direction: column;
      }
    }
  </style>
</head>
<body>
  <header>
    <div class="container header-content">
      <a href="#" class="logo">${name}</a>
      <a href="#waitlist" class="nav-cta">${hero.cta}</a>
    </div>
  </header>

  <section class="hero">
    <div class="container hero-content">
      <h1>${hero.headline}</h1>
      <p>${hero.subheadline}</p>
      <a href="#waitlist" class="hero-cta">${hero.cta}</a>
    </div>
  </section>

  <section class="features">
    <div class="container">
      <h2 class="section-title">Features</h2>
      <div class="features-grid">
        ${features.map(f => `
          <div class="feature-card">
            <div class="feature-icon">${f.icon}</div>
            <h3>${f.title}</h3>
            <p>${f.description}</p>
          </div>
        `).join('')}
      </div>
    </div>
  </section>

  <section class="benefits">
    <div class="container">
      <ul class="benefits-list">
        ${benefits.map(b => `<li>✓ ${b}</li>`).join('')}
      </ul>
    </div>
  </section>

  <section class="faq">
    <div class="container">
      <h2 class="section-title">FAQ</h2>
      <div class="faq-list">
        ${faq.map(f => `
          <div class="faq-item">
            <h4>${f.question}</h4>
            <p>${f.answer}</p>
          </div>
        `).join('')}
      </div>
    </div>
  </section>

  <section id="waitlist" class="waitlist-section">
    <div class="container">
      <h2 class="section-title">Join the Waitlist</h2>
      <p>Be the first to know when ${name} launches.</p>
      <form class="waitlist-form" onsubmit="handleWaitlist(event)">
        <input type="email" id="waitlist-email" placeholder="Enter your email" required>
        <button type="submit">Join Now</button>
      </form>
      <p id="waitlist-message" style="margin-top: 16px; color: var(--primary);"></p>
    </div>
  </section>

  <footer>
    <div class="container">
      <p>${footer.tagline}</p>
      <p style="margin-top: 8px;">${footer.copyright}</p>
    </div>
  </footer>

  <script>
    function handleWaitlist(e) {
      e.preventDefault();
      const email = document.getElementById('waitlist-email').value;
      const message = document.getElementById('waitlist-message');
      
      // In production, this would call your API
      message.textContent = 'Thanks! You\\'re on the list. We\\'ll notify you when we launch!';
      document.getElementById('waitlist-email').value = '';
    }
  </script>
</body>
</html>`;
}

// Generate default brand colors from a primary color
export function generateBrandColors(primaryColor: string = "#6366f1") {
    return {
        primary: primaryColor,
        secondary: adjustColor(primaryColor, -20),
        accent: adjustColor(primaryColor, 40),
        background: "#ffffff",
        text: "#18181b",
    };
}

// Simple color adjustment function
function adjustColor(hex: string, amount: number): string {
    const num = parseInt(hex.replace("#", ""), 16);
    const r = Math.min(255, Math.max(0, (num >> 16) + amount));
    const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amount));
    const b = Math.min(255, Math.max(0, (num & 0x0000FF) + amount));
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
