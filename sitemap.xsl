<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:html="http://www.w3.org/TR/REC-html40" xmlns:sitemap="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="html" version="1.0" encoding="UTF-8" indent="yes"/>
  <xsl:template match="/">
    <html xmlns="http://www.w3.org/1999/xhtml">
      <head>
        <title>XML Sitemap - RoitX</title>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
        <style type="text/css">
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; background-color: #f8fafc; color: #334155; margin: 0; padding: 20px; }
          .container { max-width: 1000px; margin: 0 auto; background: #fff; padding: 24px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
          h1 { color: #0f172a; font-size: 24px; margin-bottom: 8px; }
          p { color: #64748b; font-size: 14px; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th { background-color: #f1f5f9; color: #475569; text-align: left; padding: 12px; font-size: 13px; font-weight: 600; border-bottom: 2px solid #e2e8f0; }
          td { padding: 12px; font-size: 13px; border-bottom: 1px solid #f1f5f9; word-break: break-all; }
          tr:hover { background-color: #f8fafc; }
          a { color: #2563eb; text-decoration: none; font-weight: 500; }
          a:hover { text-decoration: underline; }
          .badge { background: #e0e7ff; color: #3730a3; padding: 4px 8px; border-radius: 6px; font-size: 12px; font-weight: 600; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>XML Sitemap</h1>
          <p>Total URLs in this sitemap: <xsl:value-of select="count(sitemap:urlset/sitemap:url)"/></p>
          <table>
            <thead>
              <tr>
                <th>URL / Location</th>
                <th>Priority</th>
                <th>Change Frequency</th>
                <th>Last Modified</th>
              </tr>
            </thead>
            <tbody>
              <xsl:for-each select="sitemap:urlset/sitemap:url">
                <tr>
                  <td>
                    <a href="{sitemap:loc}"><xsl:value-of select="sitemap:loc"/></a>
                  </td>
                  <td><span class="badge"><xsl:value-of select="sitemap:priority"/></span></td>
                  <td><xsl:value-of select="sitemap:changefreq"/></td>
                  <td><xsl:value-of select="sitemap:lastmod"/></td>
                </tr>
              </xsl:for-each>
            </tbody>
          </table>
        </div>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
