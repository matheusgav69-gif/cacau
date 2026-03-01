export function Footer() {
  return (
    <footer className="site-footer">
      <ul className="site-footer__links">
        <li>
          <a
            href="https://www.privacidade.com.br/portal-de-privacidade?token=e8d91724233537d3a44c65424e6b9ee7"
            target="_blank"
            rel="noreferrer"
          >
            Política de Privacidade
          </a>
        </li>
        <li>
          <a
            href="https://www.cacaushow.com.br/politica/returns.html"
            target="_blank"
            rel="noreferrer"
          >
            Política de Devoluções
          </a>
        </li>
        <li>
          <a
            href="https://www.cacaushow.com.br/terms.html"
            target="_blank"
            rel="noreferrer"
          >
            Termos de Uso
          </a>
        </li>
        <li>
          <a
            href="https://www.cacaushow.com.br/faqs.html"
            target="_blank"
            rel="noreferrer"
          >
            FAQs
          </a>
        </li>
        <li>
          <a
            href="/checkout"
            onClick={(e) => {
              e.preventDefault();
              window.history.pushState(null, "", "/checkout");
              window.dispatchEvent(new PopStateEvent("popstate"));
            }}
          >
            Checkout
          </a>
        </li>
      </ul>

      <div className="site-footer__divider" />

      <div className="site-footer__info">
        <p>© Copyright 2023. Todos os direitos reservados.</p>
        <p>Cacau Show · CNPJ 23.143.033/0002-05</p>
        <p>
          Avenida Helio Cesário Da Silva, 1445 - Bairro Jardim Vista Alegre, Município
          Embu das Artes, SP, Brasil.
        </p>
      </div>
    </footer>
  );
}

