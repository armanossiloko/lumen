using Microsoft.AspNetCore.Mvc;

namespace Lumen.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TemplatesController : ControllerBase
{
    [HttpGet]
    public ActionResult<object[]> GetTemplates()
    {
        return Ok(new object[]
        {
            new
            {
                id = "meeting-notes",
                title = "Meeting notes",
                icon = "📝",
                markdownBody = "# Meeting notes\n\n**Date:** \n**Attendees:** \n\n## Agenda\n- \n\n## Notes\n\n## Action items\n- [ ] ",
            },
            new
            {
                id = "project-brief",
                title = "Project brief",
                icon = "📋",
                markdownBody = "# Project brief\n\n## Problem\n\n## Goals\n\n## Scope\n\n## Timeline\n",
            },
            new
            {
                id = "rfc",
                title = "RFC",
                icon = "🔐",
                markdownBody = "# RFC: Title\n\n## Summary\n\n## Motivation\n\n## Proposal\n\n## Risks\n",
            },
        });
    }
}
