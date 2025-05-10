// src/components/BotpressWidget.jsx
import { useEffect } from 'react';

const BotpressWidget = () => {
  useEffect(() => {
    const injectScript = document.createElement('script');
    injectScript.src = 'https://cdn.botpress.cloud/webchat/v2.4/inject.js';
    injectScript.async = true;
    document.head.appendChild(injectScript);

    injectScript.onload = () => {
      window.botpress.init({
        botId: 'd45136d6-72b4-4ffd-98db-dc82e0ee27b7',
        clientId: 'c2bbbcd0-94c0-410e-87a0-1b3fba291bca',
        selector: '#webchat',
        configuration: {
          website: {},
          email: {},
          phone: {},
          termsOfService: {},
          privacyPolicy: {},
          color: '#5eb1ef',
          variant: 'soft',
          themeMode: 'light',
          fontFamily: 'inter',
          radius: 1,
        },
      });

      window.botpress.on('webchat:ready', () => {
        window.botpress.open();
      });
    };
  }, []);

  return (
    <div
      id="webchat"
      style={{
        width: '100%',
        height: '500px',
        maxHeight: '100%',
        maxWidth: '100%',
      }}
    />
  );
};

export default BotpressWidget;
