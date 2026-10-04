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
            padding: 12px;
          }
          @media (min-width: 640px) {
            body { padding: 24px; }
          }
          .container { 
            max-width: 1000px; 
            margin: 0 auto; 
            background: var(--card-bg); 
            padding: 16px; 
            border-radius: 16px; 
            border: 1px solid var(--border-color);
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1); 
          }
          @media (min-width: 640px) {
            .container { padding: 24px; }
          }
          .header {
            border-bottom: 1px solid var(--border-color);
            padding-bottom: 16px;
            margin-bottom: 16px;
          }
          h1 { 
            font-size: 20px; 
            margin: 0 0 4px 0; 
            background: linear-gradient(135deg, #38bdf8, #818cf8);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            font-weight: 700;
          }
          @media (min-width: 640px) {
            h1 { font-size: 24px; }
          }
          p { 
            color: var(--text-sub); 
            font-size: 13px; 
            margin: 0; 
          }
          .table-wrapper {
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
            border-radius: 8px;
          }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            text-align: left;
            min-width: 550px;
          }
          th { 
            background-color: var(--hover-bg); 
            color: var(--text-sub); 
            padding: 10px 12px; 
            font-size: 11px; 
            text-transform: uppercase;
            letter-spacing: 0.05em;
            font-weight: 600; 
            border-bottom: 2px solid var(--border-color); 
          }
          td { 
            padding: 12px; 
            font-size: 13px; 
            border-bottom: 1px solid var(--border-color); 
          }
          tr:hover td { 
            background-color: var(--hover-bg); 
          }
          a.page-title { 
            color: var(--accent-color); 
            text-decoration: none; 
            font-weight: 600; 
            font-size: 14px;
            display: block;
          }
          a.page-title:hover { 
            text-decoration: underline; 
          }
          .url-sub {
            color: var(--text-sub);
            font-size: 11px;
            margin-top: 2px;
            word-break: break-all;
          }
          .badge { 
            background: rgba(56, 189, 248, 0.15); 
            color: var(--accent-color); 
            padding: 3px 8px; 
            border-radius: 12px; 
            font-size: 11px; 
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
                  <th>Page Title &amp; URL</th>
                  <th>Priority</th>
                  <th>Frequency</th>
                  <th>Last Modified</th>
                </tr>
              </thead>
              <tbody>
                <xsl:for-each select="sitemap:urlset/sitemap:url">
                  <tr>
                    <td>
                      <!-- Display Clean Titles for All Pages -->
                      <a class="page-title" href="{sitemap:loc}">
                        <xsl:choose>
                          <xsl:when test="sitemap:loc = 'https://roitx.qd.je/'">Home</xsl:when>
                          <xsl:when test="contains(sitemap:loc, 'classes.html')">Classes &amp; Courses</xsl:when>
                          <xsl:when test="contains(sitemap:loc, 'premium-notes.html')">Premium Notes</xsl:when>
                          <xsl:when test="contains(sitemap:loc, 'formulas.html')">Important Formulas</xsl:when>
                          <xsl:when test="contains(sitemap:loc, 'subjects-9.html')">Class 9 Subjects</xsl:when>
                          <xsl:when test="contains(sitemap:loc, 'subjects-10.html')">Class 10 Subjects</xsl:when>
                          <xsl:when test="contains(sitemap:loc, 'subjects-11.html')">Class 11 Subjects</xsl:when>
                          <xsl:when test="contains(sitemap:loc, '11-arts-subjects.html')">Class 11 Arts</xsl:when>
                          <xsl:when test="contains(sitemap:loc, '11-commerce-subjects.html')">Class 11 Commerce</xsl:when>
                          <xsl:when test="contains(sitemap:loc, '11-science-subjects.html')">Class 11 Science</xsl:when>
                          <xsl:when test="contains(sitemap:loc, 'subjects-12.html')">Class 12 Subjects</xsl:when>
                          <xsl:when test="contains(sitemap:loc, '12-arts-subjects.html')">Class 12 Arts</xsl:when>
                          <xsl:when test="contains(sitemap:loc, '12-commerce-subjects.html')">Class 12 Commerce</xsl:when>
                          <xsl:when test="contains(sitemap:loc, '12-science-subjects.html')">Class 12 Science</xsl:when>
                          <xsl:when test="contains(sitemap:loc, 'ask-chat.html')">Ask AI Chat</xsl:when>
                          <xsl:when test="contains(sitemap:loc, 'solver.html')">Doubt Solver</xsl:when>
                          <xsl:when test="contains(sitemap:loc, 'study-timer.html')">Study Timer</xsl:when>
                          <xsl:when test="contains(sitemap:loc, 'calculator.html')">Scientific AI Calculator</xsl:when>
                          <xsl:when test="contains(sitemap:loc, 'calendar.html')">Calendar</xsl:when>
                          <xsl:when test="contains(sitemap:loc, 'view.html')">Notes Viewer</xsl:when>
                          <xsl:when test="contains(sitemap:loc, 'aboutus.html')">About Us &amp; Privacy</xsl:when>
                          <xsl:when test="contains(sitemap:loc, 'fun.html')">Fun Zone</xsl:when>
                          <xsl:otherwise><xsl:value-of select="sitemap:loc"/></xsl:otherwise>
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
