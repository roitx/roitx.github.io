<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:html="http://www.w3.org/TR/REC-html40" xmlns:sitemap="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="html" version="1.0" encoding="UTF-8" indent="yes"/>
  <xsl:template match="/">
    <html xmlns="http://www.w3.org/1999/xhtml" lang="hi">
      <head>
        <title>PM Roitx - XML Sitemap &amp; Directory</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
        <style type="text/css">
          :root {
            --bg-color: #071124;
            --card-bg: rgba(12, 22, 45, 0.85);
            --border-color: rgba(0, 210, 255, 0.2);
            --text-main: #f8fafc;
            --text-sub: #94a3b8;
            --accent-cyan: #00d2ff;
            --accent-purple: #a855f7;
            --hover-bg: rgba(0, 210, 255, 0.06);
          }
          [data-theme="light"] {
            --bg-color: #f1f5f9;
            --card-bg: rgba(255, 255, 255, 0.9);
            --border-color: rgba(2, 132, 199, 0.2);
            --text-main: #0f172a;
            --text-sub: #64748b;
            --accent-cyan: #0284c7;
            --accent-purple: #7c3aed;
            --hover-bg: rgba(2, 132, 199, 0.06);
          }
          * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; transition: background 0.3s ease, color 0.3s ease; }
          body { 
            background-color: var(--bg-color); 
            color: var(--text-main); 
            min-height: 100vh;
            padding: 15px;
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          @media(min-width: 640px) { body { padding: 30px; } }
          
          .container { 
            width: 100%;
            max-width: 1000px; 
            background: var(--card-bg); 
            backdrop-filter: blur(20px);
            padding: 20px; 
            border-radius: 24px; 
            border: 1px solid var(--border-color);
            box-shadow: 0 25px 50px rgba(0,0,0,0.15); 
            margin-top: 10px;
            margin-bottom: 40px;
          }
          @media(min-width: 640px) { .container { padding: 30px; } }

          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid var(--border-color);
            padding-bottom: 20px;
            margin-bottom: 24px;
            flex-wrap: wrap;
            gap: 15px;
          }
          h1 { 
            font-size: 20px; 
            font-weight: 800;
            background: linear-gradient(135deg, var(--accent-cyan), var(--accent-purple));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            display: flex;
            align-items: center;
            gap: 10px;
          }
          @media(min-width: 640px) { h1 { font-size: 24px; } }

          .header-right { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
          .total-badge {
            background: var(--hover-bg);
            border: 1px solid var(--border-color);
            color: var(--accent-cyan);
            padding: 6px 14px;
            border-radius: 30px;
            font-size: 12px;
            font-weight: 700;
          }
          .theme-toggle-btn {
            background: var(--hover-bg);
            border: 1px solid var(--border-color);
            color: var(--accent-cyan);
            width: 38px;
            height: 38px;
            border-radius: 50%;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 15px;
            box-shadow: 0 4px 10px rgba(0,0,0,0.1);
          }
          .theme-toggle-btn:hover { transform: scale(1.05); }

          .table-wrapper {
            overflow-x: auto;
            border-radius: 16px;
            border: 1px solid var(--border-color);
          }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            text-align: left;
            min-width: 600px;
          }
          th { 
            background-color: var(--hover-bg); 
            color: var(--text-sub); 
            padding: 14px 18px; 
            font-size: 11px; 
            text-transform: uppercase;
            letter-spacing: 0.08em;
            font-weight: 700; 
            border-bottom: 1px solid var(--border-color); 
          }
          td { 
            padding: 16px 18px; 
            font-size: 13px; 
            border-bottom: 1px solid var(--border-color); 
          }
          tr:last-child td { border-bottom: none; }
          tr:hover td { 
            background-color: var(--hover-bg); 
          }
          a.page-title { 
            color: var(--accent-cyan); 
            text-decoration: none; 
            font-weight: 700; 
            font-size: 14px;
            transition: 0.2s;
            display: inline-block;
          }
          a.page-title:hover { 
            text-shadow: 0 0 10px var(--accent-cyan);
          }
          .url-sub {
            color: var(--text-sub);
            font-size: 11px;
            margin-top: 4px;
            font-family: monospace;
            word-break: break-all;
          }
          .badge { 
            background: rgba(168, 85, 247, 0.15); 
            color: var(--accent-purple); 
            border: 1px solid rgba(168, 85, 247, 0.3);
            padding: 4px 10px; 
            border-radius: 20px; 
            font-size: 11px; 
            font-weight: 700; 
            display: inline-block;
          }
          .freq-text {
            color: var(--text-sub);
            font-weight: 600;
            font-size: 12px;
            text-transform: capitalize;
          }
          .date-text {
            color: var(--text-sub);
            font-family: monospace;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1><i class="fa-solid fa-sitemap"></i> PM Roitx XML Sitemap</h1>
            <div class="header-right">
              <div class="total-badge">Total Pages: <xsl:value-of select="count(sitemap:urlset/sitemap:url)"/></div>
              <button class="theme-toggle-btn" id="themeToggle" onclick="toggleTheme()" title="Toggle Theme">
                <i class="fa-solid fa-moon" id="themeIcon"></i>
              </button>
            </div>
          </div>
          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Page Title &amp; URL Link</th>
                  <th>Priority</th>
                  <th>Frequency</th>
                  <th>Last Modified</th>
                </tr>
              </thead>
              <tbody>
                <xsl:for-each select="sitemap:urlset/sitemap:url">
                  <tr>
                    <td>
                      <a class="page-title" href="{sitemap:loc}" target="_blank">
                        <xsl:choose>
                          <xsl:when test="sitemap:loc = 'https://roitx.qd.je/'">Home / Main Portal</xsl:when>
                          <xsl:when test="contains(sitemap:loc, 'classes.html')">Classes &amp; Courses</xsl:when>
                          <xsl:when test="contains(sitemap:loc, 'premium-notes.html')">Premium Notes</xsl:when>
                          <xsl:when test="contains(sitemap:loc, 'formulas.html')">Important Formulas</xsl:when>
                          <xsl:when test="contains(sitemap:loc, 'tests.html')">Practice Tests &amp; Quizzes</xsl:when>
                          <xsl:when test="contains(sitemap:loc, 'pyq-list.html')">PYQ Bank</xsl:when>
                          <xsl:when test="contains(sitemap:loc, 'pyq-anylizer.html')">PYQ Analyzer</xsl:when>
                          <xsl:when test="contains(sitemap:loc, 'refbook.html')">Reference Books</xsl:when>
                          <xsl:when test="contains(sitemap:loc, 'flashcard-list.html')">PM Roitx Flashcards Hub</xsl:when>
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
                          <xsl:when test="contains(sitemap:loc, 'performance.html')">Performance Tracker</xsl:when>
                          <xsl:when test="contains(sitemap:loc, 'library.html')">Recently Viewed Library</xsl:when>
                          <xsl:when test="contains(sitemap:loc, 'login.html')">Login Page</xsl:when>
                          <xsl:when test="contains(sitemap:loc, 'profile.html')">User Profile</xsl:when>
                          <xsl:when test="contains(sitemap:loc, 'aboutus.html')">About Us &amp; Privacy</xsl:when>
                          <xsl:when test="contains(sitemap:loc, 'fun.html')">Fun Zone</xsl:when>
                          <xsl:otherwise><xsl:value-of select="sitemap:loc"/></xsl:otherwise>
                        </xsl:choose>
                      </a>
                      <div class="url-sub"><xsl:value-of select="sitemap:loc"/></div>
                    </td>
                    <td><span class="badge"><xsl:value-of select="sitemap:priority"/></span></td>
                    <td><span class="freq-text"><xsl:value-of select="sitemap:changefreq"/></span></td>
                    <td><span class="date-text"><xsl:value-of select="sitemap:lastmod"/></span></td>
                  </tr>
                </xsl:for-each>
              </tbody>
            </table>
          </div>
        </div>

        <script type="text/javascript">
          function toggleTheme() {
            const html = document.documentElement;
            const icon = document.getElementById("themeIcon");
            if (html.getAttribute("data-theme") === "light") {
              html.removeAttribute("data-theme");
              icon.className = "fa-solid fa-moon";
              localStorage.setItem("sitemap_theme", "dark");
            } else {
              html.setAttribute("data-theme", "light");
              icon.className = "fa-solid fa-sun";
              localStorage.setItem("sitemap_theme", "light");
            }
          }

          // Initial theme load
          (function() {
            const savedTheme = localStorage.getItem("sitemap_theme");
            if (savedTheme === "light") {
              document.documentElement.setAttribute("data-theme", "light");
              document.getElementById("themeIcon").className = "fa-solid fa-sun";
            }
          })();
        </script>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
