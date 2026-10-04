<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:html="http://www.w3.org/TR/REC-html40" xmlns:sitemap="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="html" version="1.0" encoding="UTF-8" indent="yes"/>
  <xsl:template match="/">
    <html xmlns="http://www.w3.org/1999/xhtml" lang="en">
      <head>
        <title>XML Sitemap - RoitX</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
        <style type="text/css">
          :root {
            --bg-color: #0f172a;
            --card-bg: #1e293b;
            --text-main: #f8fafc;
            --text-sub: #94a3b8;
            --border-color: #334155;
            --accent-color: #38bdf8;
            --hover-bg: #1e293b;
          }
          @media (prefers-color-scheme: light) {
            :root {
              --bg-color: #f8fafc;
              --card-bg: #ffffff;
              --text-main: #0f172a;
              --text-sub: #64748b;
              --border-color: #e2e8f0;
              --accent-color: #0284c7;
              --hover-bg: #f1f5f9;
            }
          }
          body { 
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
            background-color: var(--bg-color); 
            color: var(--text-main); 
            margin: 0; 
            padding: 16px;
          }
          .container { 
            max-width: 1000px; 
            margin: 0 auto; 
            background: var(--card-bg); 
            padding: 24px; 
            border-radius: 16px; 
            border: 1px solid var(--border-color);
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1); 
          }
          .header {
            border-bottom: 1px solid var(--border-color);
            padding-bottom: 16px;
            margin-bottom: 20px;
          }
          h1 { 
            font-size: 24px; 
            margin: 0 0 6px 0; 
            background: linear-gradient(135deg, #38bdf8, #818cf8);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            font-weight: 700;
          }
          p { 
            color: var(--text-sub); 
            font-size: 14px; 
            margin: 0; 
          }
          .table-wrapper {
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
          }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            text-align: left;
            min-width: 500px;
          }
          th { 
            background-color: var(--hover-bg); 
            color: var(--text-sub); 
            padding: 12px 16px; 
            font-size: 12px; 
            text-transform: uppercase;
            letter-spacing: 0.05em;
            font-weight: 600; 
            border-bottom: 2px solid var(--border-color); 
          }
          td { 
            padding: 14px 16px; 
            font-size: 14px; 
            border-bottom: 1px solid var(--border-color); 
          }
          tr:hover td { 
            background-color: var(--hover-bg); 
          }
          a.page-title { 
            color: var(--accent-color); 
            text-decoration: none; 
            font-weight: 600; 
            font-size: 15px;
            display: block;
          }
          a.page-title:hover { 
            text-decoration: underline; 
          }
          .url-sub {
            color: var(--text-sub);
            font-size: 12px;
            margin-top: 2px;
            word-break: break-all;
          }
          .badge { 
            background: rgba(56, 189, 248, 0.15); 
            color: var(--accent-color); 
            padding: 4px 10px; 
            border-radius: 20px; 
            font-size: 12px; 
            font-weight: 600; 
            display: inline-block;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>RoitX XML Sitemap</h1>
            <p>Total Pages: <strong><xsl:value-of select="count(sitemap:urlset/sitemap:url)"/></strong></p>
          </div>
          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Page Name &amp; Link</th>
                  <th>Priority</th>
                  <th>Frequency</th>
                  <th>Last Modified</th>
                </tr>
              </thead>
              <tbody>
                <xsl:for-each select="sitemap:urlset/sitemap:url">
                  <tr>
                    <td>
                      <!-- Display Page Name dynamically -->
                      <a class="page-title" href="{sitemap:loc}">
                        <xsl:choose>
                          <xsl:when test="sitemap:loc = 'https://roitx.qd.je/'">Homepage</xsl:when>
                          <xsl:otherwise>
                            <xsl:value-of select="sitemap:loc"/>
                          </xsl:otherwise>
                        </xsl:choose>
                      </a>
                      <div class="url-sub"><xsl:value-of select="sitemap:loc"/></div>
                    </td>
                    <td><span class="badge"><xsl:value-of select="sitemap:priority"/></span></td>
                    <td><xsl:value-of select="sitemap:changefreq"/></td>
                    <td><xsl:value-of select="sitemap:lastmod"/></td>
                  </tr>
                </xsl:for-each>
              </tbody>
            </table>
          </div>
        </div>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
