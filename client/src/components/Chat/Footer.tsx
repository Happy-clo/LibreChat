import React, { useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import TagManager from 'react-gtm-module';
import Constants from './Constants';
import { Constants } from 'librechat-data-provider';
import { useGetStartupConfig } from 'librechat-data-provider/react-query';
import { useLocalize } from '~/hooks';

export default function Footer({ className }: { className?: string }) {
  const { data: config } = useGetStartupConfig();
  const localize = useLocalize();

  const privacyPolicy = config?.interface?.privacyPolicy;
  const termsOfService = config?.interface?.termsOfService;

  const logDeviceInfo = () => {
    const userAgent = navigator.userAgent;
    const platform = navigator.platform;
    const deviceInfo = {
      userAgent,
      platform,
    };
    console.log('Device Info:', deviceInfo);
  };

  const handleLinkClick = (url: string) => {
    logDeviceInfo();
    window.open(url, '_blank', 'noreferrer');
  };

  const privacyPolicyRender = privacyPolicy?.externalUrl != null && (
    <a
      className="text-text-secondary underline"
      href="#"
      onClick={() => handleLinkClick(privacyPolicy.externalUrl)}
    >
      {localize('com_ui_privacy_policy')}
    </a>
  );

  const termsOfServiceRender = termsOfService?.externalUrl != null && (
    <a
      className="text-text-secondary underline"
      href="#"
      onClick={() => handleLinkClick(termsOfService.externalUrl)}
    >
      {localize('com_ui_terms_of_service')}
    </a>
  );

  const mainContentParts = (
    (typeof config?.customFooter === 'string' ? config.customFooter : `[HappyChat v1.0.0](https://github.com/Happy-clo/LibreChat/tree/main?tab=readme-ov-file#about-this-fork) - ${localize('com_ui_latest_footer')}`)
    .split('|')
  );

  useEffect(() => {
    if (config?.analyticsGtmId != null && typeof window.google_tag_manager === 'undefined') {
      const tagManagerArgs = {
        gtmId: config.analyticsGtmId,
      };
      TagManager.initialize(tagManagerArgs);
    }
  }, [config?.analyticsGtmId]);

  const mainContentRender = mainContentParts.map((text, index) => (
    <React.Fragment key={`main-content-part-${index}`}>
      <ReactMarkdown
        components={{
          a: ({ node: _n, href, children, ...otherProps }) => {
            return (
              <a
                className="text-text-secondary underline"
                href="#"
                onClick={() => handleLinkClick(href)}
                {...otherProps}
              >
                {children}
              </a>
            );
          },
          p: ({ node: _n, ...props }) => <span {...props} />,
        }}
      >
        {text.trim()}
      </ReactMarkdown>
    </React.Fragment>
  ));

  const footerElements = [...mainContentRender, privacyPolicyRender, termsOfServiceRender].filter(
    Boolean,
  );

  return (
    <div
      className={
        className ??
        'relative flex items-center justify-center gap-2 px-2 py-2 text-center text-xs text-text-primary md:px-[60px]'
      }
      role="contentinfo"
    >
      {footerElements.map((contentRender, index) => {
        const isLastElement = index === footerElements.length - 1;
        return (
          <React.Fragment key={`footer-element-${index}`}>
            {contentRender}
            {!isLastElement && (
              <div key={`separator-${index}`} className="h-2 border-r-[1px] border-border-medium" />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};