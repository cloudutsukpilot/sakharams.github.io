---
layout: post
title: FedRAMP Certification
categories: [architect, security, fedramp]
tags: [Architect, Security, FedRAMP]
---


## FedRAMP Certification

- Below is a high-level checklist of the main requirements for a cloud service provider (CSP) to become FedRAMP compliant:

1. `System Security Plan (SSP)`:
- Detailed documentation describing all the security controls you’ve implemented in your environment.
- System overview, system boundaries, system environment, and system data flow diagrams.

2. `Security Assessment Plan (SAP)`:
- Document detailing the planned assessment efforts.
- Identification of security controls to be tested, assessment procedures, and expected outcomes.

3. `Security Assessment Report (SAR):`
- A report that details the results of the security assessment.
- Identification of vulnerabilities, risks, and recommendations.

4. `Plan of Action and Milestones (POA&M):`
- Document identifying risks and plans for mitigation.
- Explanation of how and when vulnerabilities identified in the SAR will be addressed.

5. `Continuous Monitoring Strategy & Plan:`
- A strategy for ongoing monitoring of security controls.
- Includes the frequency and methods of testing, roles and responsibilities, and reporting requirements.

6. `Training`: 
- Ensure all personnel have adequate security training.

7. `Implement NIST Security Controls`:
- Implement the security controls specified in NIST Special Publication 800-53, based on the system’s impact level (Low, Moderate, or High).

8. `Third-Party Assessment Organization (3PAO):`
- Engage a 3PAO to perform an independent assessment of your security controls and provide an objective SAR.

9. `Authorization Package`: 
- Submit the package to the appropriate governing body (Joint Authorization Board (JAB) or an agency) for a Provisional Authorization to Operate (P-ATO) or an Authorization to Operate (ATO).

10. `Incident Reporting`: 
- Establish a process for reporting security incidents to FedRAMP and other relevant agencies within specified timeframes.

11. `Continuous Monitoring`: 
- Commit to ongoing monitoring and regular reporting of security control effectiveness.

12. `FedRAMP Package Repository`: 
- Utilize the secure repository to submit documentation and updates.

13. `Periodic Assessments`: 
- Undergo periodic reassessment (typically every three years) to ensure ongoing compliance.

14. `Engage with FedRAMP PMO (Program Management Office)`: 
- Ensure open communication with the PMO and adhere to guidance and feedback.

15. `Policies and Procedures`: 
- Establish and maintain comprehensive security and privacy policies and procedures in line with NIST and FedRAMP requirements.

16. `Role-based Training`: 
- Ensure training is provided to staff based on their role within the organization and relevant to the cloud service offering.



#### Below is an easy to review the summary of the most critical steps to compliance:

- Continuous Monitoring
    + Address every vulnerability found in your continuous monitoring program
    + Remediate the vulnerability. Establish a Deviation Request Process. Justify findings as “Vendor Dependency” and establish 30-day vendor contact timetable.
    + Align monthly monitoring scans and Plan of Action & Milestones (POA&M) to sync with your patch management program to report only real vulnerabilities not ones already scheduled for remediation.

- Security Controls
    + Review for commonly overlooked or insufficiently answered controls.
        When reviewing the “Implementing Configuration Settings (CM-6)” make sure to identify all system components requiring configuration management, individuals responsible for configuration, how responsible part configures, any additional FedRAMP requirements included, and where you saved the documentation.

    + Review for common missed or neglected FedRAMP or NIST requirements
        Not identifying portals, lacking multi-factor authentication, non-segregation of customers, high vulnerabilities detected during testing, unclear authorization boundaries, incomplete or poorly defined policies and procedures are all examples of common documentation problems.

- General Program
    + Communicate with your FedRAMP Information System Security Officer (ISSO) or government liaison.
    + A Cloud Service Offering (CSO) must be approved and granted FedRAMP Provisional Authorization to Operate (P-ATO) or Agency ATO before leveraging security controls.
    + Use NIST SP 800-53 Revision 1 Contingency Planning Guide for Federal Information System Appendix B to create a Business Impact Analysis
    + If you are a moderate impact CSP and want to want to move into Law Enforcement, Emergency Services, Financial Systems, Health Systems, or any other high impact category, you should review the Categorization Change Form Template first.

- Readiness Assessment Report (RAR)
    + Always send an email notification to info@fedramp.gov when submitting a RAR or RAR update or authorization package to ensure review.

- Security Assessment Plan (SAP) & Security Assessment Report (SAR)
    + If 3PAO validates/determines a finding a “False Positive” ensure that the JAB also approves those findings otherwise, they must be added to the Continuous Monitoring (ConMon) POA&M.
    + 3PAO vulnerability scanning includes reviewing tools for configurations, ensuring scans meeting FedRAMP requirements, overseeing and monitoring scans, describing and executing procedures.
    + Penetration testing tools must be in the SAP and match the Penetration Test Plan document.
    + Document False Positives or corrected findings with specific items of evidence such as screenshots or scan files, list by file name, and include with the SAR.
    + Assign unique Vulnerability Identifiers and ensure previously documented vulnerabilities are not assigned new identifiers.

- System Security Plan (SSP)
    + Security requirements for each control include a description of the solution, how it meets security control requirement, responsible parties, how often reviewed, who reviews, what triggers reviews, documentation of reviews, proof of review, any policies referenced as implementation reasons.
    + Review “Security Procedures” to include all steps for users, system operations personnel, or others. FedRAMP notes the following examples of procedures:



FedRAMP Security Controls Baseline
https://www.fedramp.gov/assets/resources/documents/FedRAMP_Security_Controls_Baseline.xlsx

FedRAMP Initial Authorization Package Checklist
https://www.fedramp.gov/assets/resources/templates/FedRAMP-Initial-Authorization-Package-Checklist.xlsx

What is FedRAMP? Complete Guide to FedRAMP Authorization and Certification
https://www.a-lign.com/articles/everything-you-need-to-know-about-fedramp