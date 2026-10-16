import { useEffect, useState } from "react";
import type { MouseEvent } from "react";
import type { ActiveModal } from "../types";
import { TechifyLogo } from "./TechifyLogo";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Check,
  ChevronDown,
  CreditCard,
  HandCoins,
  Menu,
  Moon,
  Network,
  Plug,
  Sun,
  X,
  Zap,
} from "lucide-react";

const signupUrl = "#cadastro-empresa";

const loginUrl = "#login";

const benefits = [
  {
    number: "01",
    icon: Network,
    title: "Checkout para sua empresa",
    copy: "Crie links de pagamento para produtos digitais, serviços e assinaturas." ,
  },
  {
    number: "02",
    icon: BarChart3,
    title: "Assinaturas e cobranças",
    copy: "Gerencie planos e acompanhe o histórico de pagamentos em um só lugar.",
  },
  {
    number: "03",
    icon: HandCoins,
    title: "Integração simplificada",
    copy: "Integre seu negócio com links de checkout, API e webhooks.",
  },
];

const steps = [
  ["01", "Cadastre seu produto", "Crie o perfil da empresa e apresente seus planos na plataforma."],
  ["02", "Configure o checkout", "Defina o preço e o tipo de cobrança para sua oferta."],
  ["03", "Compartilhe o link", "Use seu checkout na página de vendas ou integre com seu sistema."],
  ["04", "Acompanhe pagamentos", "Consulte as cobranças e o histórico financeiro no painel."],
];

const faqs = [
  [
    "O que é a LeadsPay?",
    "A LeadsPay oferece a empresas uma plataforma de checkout e gestão de pagamentos integrada à Stripe, com produtos e planos em um só lugar.",
  ],
  [
    "Como funciona para uma empresa?",
    "A empresa cadastra seus produtos, configura o checkout e acompanha os pagamentos em seu painel.",
  ],
  [
    "Quem pode criar uma conta?",
    "Nesta fase, o cadastro público é exclusivo para empresas. O programa de afiliados não está aberto para novas inscrições.",
  ],
  [
    "Quais integrações estão disponíveis?",
    "A plataforma apresenta integrações via API REST, webhooks e MCP para conectar o fluxo comercial a outras ferramentas.",
  ],
  [
    "Como funcionam os recebimentos?",
    "Os recebimentos dependem da configuração e verificação da conta Stripe, das condições da plataforma e dos prazos aplicáveis.",
  ],
];

function Brand({ footer = false }: { footer?: boolean }) {
  return (
    <a className={`brand ${footer ? "brand-footer" : ""}`} href="#inicio" aria-label="LeadsPay — início">
      <TechifyLogo size={footer ? "lg" : "md"} surface={footer ? "dark" : "light"} />
    </a>
  );
}

function ThemeToggle({ isDark, onToggle }: { isDark: boolean; onToggle: () => void }) {

  return (
    <button
      className="theme-toggle"
      type="button"
      onClick={onToggle}
      aria-label={isDark ? "Ativar tema claro" : "Ativar tema escuro"}
      aria-pressed={isDark}
      title={isDark ? "Mudar para tema claro" : "Mudar para tema escuro"}
    >
      {isDark ? <Sun size={17} aria-hidden="true" /> : <Moon size={17} aria-hidden="true" />}
      <span>{isDark ? "Claro" : "Escuro"}</span>
    </button>
  );
}

function Header({ isDark, onToggleTheme }: { isDark: boolean; onToggleTheme: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);

  return (
    <>
      <div className="announcement">
        <div className="container announcement-inner">
          <span className="announcement-dot" aria-hidden="true" />
          <span>CHECKOUT</span><i aria-hidden="true">·</i><span>ASSINATURAS</span><i aria-hidden="true">·</i><span>INTEGRAÇÕES</span>
          <span className="announcement-divider" aria-hidden="true" />
          <span className="announcement-note">Pagamentos para empresas digitais</span>
          <a className="announcement-link" href="#produto" aria-label="Saiba mais sobre a plataforma">
            <ArrowRight size={13} aria-hidden="true" />
          </a>
        </div>
      </div>
      <header className="site-header">
      <div className="container nav-shell">
          <Brand />
          <nav id="primary-navigation" className={`main-nav ${menuOpen ? "is-open" : ""}`} aria-label="Navegação principal">
            <a href="#produto" onClick={closeMenu}>Produto</a>
            <a href="#como-funciona" onClick={closeMenu}>Como funciona</a>
            <a href="#para-quem" onClick={closeMenu}>Para quem</a>
            <a href="#tecnologia" onClick={closeMenu}>Tecnologia</a>
            <div className="mobile-nav-actions">
              <ThemeToggle isDark={isDark} onToggle={onToggleTheme} />
              <a className="button button-primary mobile-cta" href={signupUrl}>Criar conta empresarial <ArrowUpRight size={15} aria-hidden="true" /></a>
            </div>
          </nav>
          <div className="desktop-nav-actions">
            <ThemeToggle isDark={isDark} onToggle={onToggleTheme} />
            <a className="login-link" href={loginUrl}>Entrar <ArrowUpRight size={14} aria-hidden="true" /></a>
            <a className="button button-primary header-cta" href={signupUrl}>Criar conta empresarial <ArrowUpRight size={15} aria-hidden="true" /></a>
          </div>
          <button
            className="menu-toggle"
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
            aria-expanded={menuOpen}
            aria-controls="primary-navigation"
          >
            {menuOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
          </button>
        </div>
      </header>
    </>
  );
}

function Hero() {
  return (
    <section className="hero container" id="inicio">
      <div className="hero-grid">
        <div className="hero-copy">
          <p className="eyebrow"><span className="eyebrow-icon"><Zap size={13} aria-hidden="true" /></span> PAGAMENTOS <i>•</i> ASSINATURAS <i>•</i> INTEGRAÇÕES</p>
          <h1>Pagamentos simples.<br /><span>Seu negócio cresce.</span></h1>
          <p className="hero-description">Venda produtos digitais, serviços e assinaturas com checkout integrado e gestão de pagamentos em um só lugar.</p>
          <div className="hero-actions">
            <a className="button button-primary button-large" href={signupUrl}>Criar conta empresarial <ArrowUpRight size={17} aria-hidden="true" /></a>
            <a className="button button-secondary button-large" href={loginUrl}>Acessar painel <ArrowUpRight size={16} aria-hidden="true" /></a>
          </div>
          <ul className="hero-proof" aria-label="Recursos em destaque">
            <li><Check size={14} aria-hidden="true" /> Checkout integrado</li>
            <li><Check size={14} aria-hidden="true" /> Produtos e assinaturas</li>
            <li><Check size={14} aria-hidden="true" /> Gestão em tempo real</li>
          </ul>
          <a className="scroll-cue" href="#produto"><span className="scroll-line" aria-hidden="true" /> Role para explorar <ArrowDown size={13} aria-hidden="true" /></a>
        </div>
        <div className="hero-visual" aria-label="Painel de pagamentos LeadsPay em demonstração">
          <div className="hero-orbit orbit-one" aria-hidden="true" />
          <div className="hero-orbit orbit-two" aria-hidden="true" />
          <div className="hero-image-wrap">
            <img
              className="hero-image"
              src="/leadspay-dashboard-light.webp"
              alt="Ilustração de um painel de pagamentos com gráficos em verde em notebook e celular"
              fetchPriority="high"
            />
          </div>
          <div className="float-card payment-float">
            <span className="float-icon"><Check size={15} aria-hidden="true" /></span>
            <span><small>FLUXO DE PAGAMENTO</small><strong>Pagamento aprovado</strong></span>
            <b className="float-demo">DEMO</b>
          </div>
          <div className="float-card split-float">
            <span className="float-icon split-icon"><Network size={15} aria-hidden="true" /></span>
            <span><small>DISTRIBUIÇÃO AUTOMÁTICA</small><strong>Comissão atribuída</strong></span>
            <Check className="float-check" size={16} aria-hidden="true" />
          </div>
          <p className="visual-caption"><span /> EXPERIÊNCIA LEADSPAY <i>•</i> DEMONSTRAÇÃO VISUAL</p>
          <div className="visual-index" aria-hidden="true"><span>01</span> / 03</div>
        </div>
      </div>
      <div className="flow-strip" aria-label="Etapas conectadas do fluxo Leadspay">
        <div className="flow-intro"><span>UMA ESTRUTURA, UM FLUXO</span><strong>Da oferta ao repasse.<br />Sem perder a conexão.</strong></div>
        <div className="flow-step"><span className="flow-icon"><CreditCard size={17} aria-hidden="true" /></span><span><small>COBRANÇA</small><strong>Checkout integrado</strong></span></div>
        <div className="flow-step"><span className="flow-icon"><Network size={17} aria-hidden="true" /></span><span><small>PRODUTOS</small><strong>Planos e ofertas</strong></span></div>
        <div className="flow-step"><span className="flow-icon"><HandCoins size={17} aria-hidden="true" /></span><span><small>GESTÃO</small><strong>Pagamentos e repasses</strong></span></div>
        <div className="flow-step"><span className="flow-icon"><Plug size={17} aria-hidden="true" /></span><span><small>INTEGRAÇÃO</small><strong>API · Webhooks · MCP</strong></span></div>
      </div>
    </section>
  );
}

function SectionHeading({ kicker, title, accent, copy }: { kicker: string; title: string; accent?: string; copy: string }) {
  return (
    <div className="section-heading">
      <div>
        <p className="eyebrow"><span className="eyebrow-dash" /> {kicker}</p>
        <h2>{title}{accent && <> <span>{accent}</span></>}</h2>
      </div>
      <p className="section-intro">{copy}</p>
    </div>
  );
}

function ProductSection() {
  return (
    <section className="section product-section container" id="produto">
      <SectionHeading
        kicker="O ECOSSISTEMA LEADSPAY — 01"
        title="Seu produto merece"
        accent="um checkout simples."
        copy="Ferramentas de pagamento para empresas que vendem produtos e assinaturas digitais."
      />
      <div className="benefit-grid">
        {benefits.map(({ number, icon: Icon, title, copy }) => (
          <article className="benefit-card" key={number}>
            <div className="card-topline"><span className="card-icon"><Icon size={19} aria-hidden="true" /></span><span className="card-number">{number}</span></div>
            <h3>{title}</h3>
            <p>{copy}</p>
            <span className="card-arrow" aria-hidden="true"><ArrowUpRight size={16} /></span>
          </article>
        ))}
      </div>
      <div className="bridge-card">
        <div className="bridge-copy">
          <p className="eyebrow">MAIS QUE UM CHECKOUT</p>
          <h3>Uma conexão entre<br /><span>seu produto e o pagamento.</span></h3>
          <a className="text-link" href="#para-quem">Descubra como funciona <ArrowRight size={15} aria-hidden="true" /></a>
        </div>
        <div className="bridge-art">
          <img src="/leadspay-network-light.webp" alt="Arte abstrata de uma rede conectando produtos digitais e oportunidades" loading="lazy" />
          <span className="bridge-label"><TechifyLogo size="sm" surface="light" /> <span>NETWORK</span></span>
        </div>
        <span className="bridge-index" aria-hidden="true">01 — 03</span>
      </div>
    </section>
  );
}

function AudienceSection() {
  return (
    <section className="section audience-section" id="para-quem">
      <div className="container">
        <SectionHeading
          kicker="FEITA PARA EMPRESAS."
          title="Feita para quem"
          accent="vende e recebe."
          copy="Centralize produtos, checkouts e pagamentos em um único painel."
        />
        <div className="audience-grid">
          <article className="audience-card audience-business">
            <div className="audience-card-head"><span className="audience-label">01 / EMPRESAS</span><span className="audience-icon"><BarChart3 size={19} aria-hidden="true" /></span></div>
            <h3>Você vende.<br /><span>A LeadsPay organiza os pagamentos.</span></h3>
            <p>Cadastre produtos e planos, configure links de checkout e acompanhe suas cobranças.</p>
            <ul><li><Check size={15} aria-hidden="true" /> Cadastre seus planos comerciais</li><li><Check size={15} aria-hidden="true" /> Configure suas condições de pagamento</li><li><Check size={15} aria-hidden="true" /> Acompanhe suas vendas</li></ul>
            <a className="button button-primary" href={signupUrl}>Cadastrar minha empresa <ArrowUpRight size={15} aria-hidden="true" /></a>
          </article>
          <article className="audience-card audience-affiliate">
            <div className="audience-card-head"><span className="audience-label">02 / INTEGRAÇÕES</span><span className="audience-icon"><ArrowUpRight size={19} aria-hidden="true" /></span></div>
            <h3>Seu sistema.<br /><span>Conectado ao checkout.</span></h3>
            <p>Use links de pagamento e webhooks para integrar o checkout à sua operação.</p>
            <ul><li><Check size={15} aria-hidden="true" /> Crie links de pagamento</li><li><Check size={15} aria-hidden="true" /> Integre à sua página</li><li><Check size={15} aria-hidden="true" /> Acompanhe eventos de pagamento</li></ul>
            <a className="button button-secondary" href={signupUrl}>Criar conta empresarial <ArrowUpRight size={15} aria-hidden="true" /></a>
          </article>
        </div>
      </div>
    </section>
  );
}

function StepsSection() {
  return (
    <section className="section steps-section container" id="como-funciona">
      <SectionHeading
        kicker="UM FLUXO CLARO — 02"
        title="Da oferta ao"
        accent="checkout integrado."
        copy="Uma jornada para sua empresa começar a vender com links de pagamento."
      />
      <div className="steps-grid">
        {steps.map(([number, title, copy]) => (
          <article className="step-card" key={number}>
            <div className="step-top"><span>{number}</span><span className="step-line" /></div>
            <h3>{title}</h3>
            <p>{copy}</p>
          </article>
        ))}
      </div>
      <div className="steps-cta"><span><b>MENOS COMPLEXIDADE</b><strong>Mais energia para crescer.</strong></span><a className="button button-primary" href={signupUrl}>Criar conta empresarial <ArrowUpRight size={15} aria-hidden="true" /></a></div>
    </section>
  );
}

function TechnologySection() {
  return (
    <section className="section technology-section" id="tecnologia">
      <div className="container">
        <SectionHeading
          kicker="TECNOLOGIA QUE ACOMPANHA O SEU NEGÓCIO — 03"
          title="Do pagamento"
          accent="ao repasse."
          copy="Conheça os componentes de checkout, integração e gestão de pagamentos."
        />
        <div className="technology-layout">
          <div className="technology-copy">
            <article className="tech-item"><span className="tech-item-icon"><CreditCard size={18} aria-hidden="true" /></span><div><h3>Checkout integrado</h3><p>Uma jornada de pagamento dentro da operação.</p></div></article>
            <article className="tech-item"><span className="tech-item-icon"><Network size={18} aria-hidden="true" /></span><div><h3>Links de pagamento</h3><p>Compartilhe seu checkout com seus clientes.</p></div></article>
            <article className="tech-item"><span className="tech-item-icon"><HandCoins size={18} aria-hidden="true" /></span><div><h3>Gestão de recebimentos</h3><p>Acompanhe cobranças e valores em seu painel.</p></div></article>
            <div className="integration-pills"><span>API REST</span><span>Webhooks</span><span>MCP</span></div>
            <a className="text-link" href="#tecnologia">Conhecer as integrações <ArrowRight size={15} aria-hidden="true" /></a>
          </div>
          <div className="dashboard-showcase">
            <img src="/leadspay-dashboard-light.webp" alt="Demonstração visual do painel Leadspay para acompanhar vendas, comissões e pagamentos" loading="lazy" />
            <div className="dashboard-overlay"><span className="dashboard-brand"><TechifyLogo size="sm" surface="light" /></span><span className="live-tag"><i /> VISUAL DE DEMONSTRAÇÃO</span></div>
            <div className="dashboard-side-note"><span>CLAREZA DO PRIMEIRO CLIQUE</span><b>ao último saque</b></div>
          </div>
        </div>
      </div>
    </section>
  );
}

function PricingSection() {
  return (
    <section className="section pricing-section container">
      <div className="pricing-panel">
        <div className="pricing-copy">
          <p className="eyebrow">CONDIÇÕES PUBLICADAS NO SITE</p>
          <h2>Sem mensalidade.<br /><span>Sem surpresas.</span></h2>
          <p>Uma estrutura comercial para você crescer com regras visíveis e custos descritos na plataforma.</p>
          <a className="text-link" href="#tecnologia">Conferir condições <ArrowRight size={15} aria-hidden="true" /></a>
        </div>
        <div className="pricing-values">
          <article><span>01 / CHECKOUT</span><strong>R$ 0,99</strong><p>taxa fixa divulgada por checkout</p></article>
          <article><span>02 / SAQUE</span><strong>R$ 2,00</strong><p>taxa fixa LeadsPay por solicitação</p></article>
          <article><span>03 / MÍNIMO</span><strong>R$ 10</strong><p>valor mínimo de saque divulgado</p></article>
          <small>Consulte os termos, as taxas e as condições vigentes da plataforma antes de contratar.</small>
        </div>
      </div>
    </section>
  );
}

function FAQSection() {
  return (
    <section className="section faq-section container" id="duvidas">
      <div className="faq-intro">
        <p className="eyebrow">PERGUNTAS FREQUENTES</p>
        <h2>Ficou com<br /><span>alguma dúvida?</span></h2>
        <p>O essencial sobre produtos, checkout, integrações e pagamentos.</p>
        <div className="faq-contact">Precisa de mais detalhes?<br /><strong>Fale com a equipe LeadsPay.</strong></div>
      </div>
      <div className="faq-list">
        {faqs.map(([question, answer], index) => (
          <details className="faq-item" key={question} open={index === 0}>
            <summary><span className="faq-number">{String(index + 1).padStart(2, "0")}</span><span>{question}</span><ChevronDown size={17} aria-hidden="true" /></summary>
            <p>{answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="final-cta container">
      <div className="cta-pattern" aria-hidden="true"><span /><span /><span /></div>
      <div className="cta-content">
        <p className="eyebrow"><span className="eyebrow-dash" /> SUA PRÓXIMA VENDA PODE COMEÇAR AQUI</p>
        <h2>Seu próximo passo<br />é <span>conectar.</span></h2>
        <p>Cadastre sua empresa, configure sua oferta e comece a preparar seu checkout.</p>
        <div className="hero-actions">
          <a className="button button-primary button-large" href={signupUrl}>Cadastrar minha empresa <ArrowUpRight size={16} aria-hidden="true" /></a>
          <a className="button button-light button-large" href={loginUrl}>Entrar na plataforma <ArrowUpRight size={16} aria-hidden="true" /></a>
        </div>
      </div>
      <div className="cta-monogram" aria-hidden="true"><TechifyLogo size="xl" surface="dark" /></div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-main">
        <div className="footer-brand-block">
          <Brand footer />
          <p>Plataforma de checkout e gestão de pagamentos para empresas digitais.</p>
          <span className="footer-country">BRASIL <i>·</i> DIGITAL BY NATURE</span>
        </div>
        <div className="footer-column"><h3>NAVEGAÇÃO</h3><a href="#inicio">Início</a><a href="#produto">Produto</a><a href="#como-funciona">Como funciona</a><a href="#para-quem">Para quem</a></div>
        <div className="footer-column"><h3>ECOSSISTEMA</h3><a href="#tecnologia">Tecnologia e pagamentos</a><a href="#tecnologia">Integrações</a><a href="#duvidas">Perguntas frequentes</a><a href={signupUrl}>Cadastrar empresa</a></div>
        <div className="footer-column"><h3>PORTAL &amp; JURÍDICO</h3><a href={loginUrl}>Entrar na plataforma <ArrowUpRight size={13} aria-hidden="true" /></a><a href="/legal.html">Termos de uso</a><a href="/legal.html">Privacidade</a><a href="/legal.html">Cookies</a></div>
      </div>
      <div className="container footer-bottom"><span>© {new Date().getFullYear()} LEADSPAY. Todos os direitos reservados.</span><a href="#inicio">Voltar ao topo <ArrowUpRight size={13} aria-hidden="true" /></a></div>
    </footer>
  );
}

export default function LeadspayLanding({
  onOpenModal,
  onOpenPlatform,
}: {
  onOpenModal: (modal: ActiveModal) => void;
  onOpenPlatform: () => void;
}) {
  const [isDark, setIsDark] = useState(() => {
    try {
      return typeof window !== "undefined" && window.localStorage.getItem("leadspay-landing-theme") === "dark";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const theme: "light" | "dark" = isDark ? "dark" : "light";

    document.documentElement.setAttribute("data-leadspay-theme", theme);
    document.body.setAttribute("data-leadspay-theme", theme);

    try {
      window.localStorage.setItem("leadspay-landing-theme", theme);
      window.localStorage.setItem("leadspay-platform-theme", theme);
    } catch {
      // O tema continua funcionando durante a sessão mesmo se o storage estiver indisponível.
    }

    window.dispatchEvent(new CustomEvent("leadspay-theme-change", { detail: theme }));

    return () => {
      document.documentElement.removeAttribute("data-leadspay-theme");
      document.body.removeAttribute("data-leadspay-theme");
    };
  }, [isDark]);

  useEffect(() => {
    const syncTheme = (event: Event) => {
      const theme = (event as CustomEvent<"light" | "dark">).detail;
      if (theme === "light" || theme === "dark") setIsDark(theme === "dark");
    };
    window.addEventListener("leadspay-theme-change", syncTheme);
    return () => window.removeEventListener("leadspay-theme-change", syncTheme);
  }, []);

  const handleLandingClick = (event: MouseEvent<HTMLDivElement>) => {
    const link = (event.target as HTMLElement).closest<HTMLAnchorElement>(
      'a[href="#login"], a[href="#cadastro-empresa"], a[href="#cadastro-afiliado"]'
    );
    if (!link) return;
    event.preventDefault();
    if (link.getAttribute("href") === "#login") {
      onOpenPlatform();
    } else {
      onOpenModal("register_company");
    }
  };

  return (
    <div className="leadspay-site" data-theme={isDark ? "dark" : "light"} onClick={handleLandingClick}>
      <a className="skip-link" href="#conteudo">Pular para o conteúdo</a>
      <Header isDark={isDark} onToggleTheme={() => setIsDark(value => !value)} />
      <main id="conteudo">
        <Hero />
        <ProductSection />
        <AudienceSection />
        <StepsSection />
        <TechnologySection />
        <PricingSection />
        <FAQSection />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}
