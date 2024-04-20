---
layout: post
title: Introduction to Diagrams
categories: [devops, dac, diagrams]
tags: [DevOps, DAC,Diagrams]
---


* Diagrams lets you draw the cloud system architecture in Python code.
* It was born for prototyping a new system architecture without any design tools. You can also describe or visualize the existing system architecture as well.
* Diagram as Code allows you to track the architecture diagram changes in any version control system.
* Diagrams currently supports main major providers including: AWS, Azure, GCP, Kubernetes, Alibaba Cloud, Oracle Cloud etc... It also supports On-Premise nodes, SaaS and major Programming frameworks and languages.


#### Installation
1. It requires Python 3.6 or higher.
2. It uses Graphviz to render the diagram, so you need to install Graphviz to use diagrams.
Ref: https://graphviz.gitlab.io/download/
3. Install the diagrams.
Ref: https://diagrams.mingrammer.com/docs/getting-started/installation


#### Getting Started
1. Create a python file - diagram.py and paste the below code

    ```
    Quick Start
    # diagram.py
    from diagrams import Diagram
    from diagrams.aws.compute import EC2
    from diagrams.aws.database import RDS
    from diagrams.aws.network import ELB

    with Diagram("Web Service", show=False):
        ELB("lb") >> EC2("web") >> RDS("userdb")
    ```

2. Run the below command to generate the diagram which will be saved in the same directory as png.

    ```
    python diagram.py
    ```
