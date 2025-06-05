---
layout: post
title: 2 - Data Link Layer
categories: [networking, basics]
tags: [Networking]
image: /assets/img/networking/networking-posts.jpg
description: Understanding the Data Link Layer in the OSI or TCP/IP Model
---

## Introduction

The Data Link Layer (DLL) is the second layer in the OSI (Open Systems Interconnection) model, situated between the Physical Layer and the Network Layer. It plays a pivotal role in ensuring reliable and efficient communication between directly connected nodes in a network.

Data Link Layer provides a means for exchanging data over a common local media.

This layer is responsible for framing, addressing, error detection and correction, and flow control. To manage these tasks effectively, the Data Link Layer is divided into two sublayers:

- Logical Link Control (LLC)
- Media Access Control (MAC)

### Sub-Layers of the Data Link Layer

1. **Logical Link Control (LLC)**
    - The LLC sub-layer provides an interface between the Network Layer and the MAC sub-layer.
    - LLC provides error detection using 4 bytes Ethernet trailer filed called `Frame Check Sequence(FCS)`
    - The FCS field contains a value that is calculated by the source node based on the payload in the frame. This value is placed in the Ethernet trailer of frame.
    - When the destination node receives the frame, the FCS value is recalculated and compared with the FCS value included in the frame.
    - It is responsible for:
      - `Multiplexing`: Allowing multiple network protocols to coexist within a multi-point network and be transported over the same network medium.
      - `Flow Control`: Managing the pacing of data transmission to ensure that the sender does not overwhelm the receiver.
      - `Error Control`: Detecting and possibly correcting errors that may occur in the Physical Layer.

2. **Media Access Control (MAC)**

    ![MAC Address](/assets/img/networking/basics/mac-address.jpg)

    - The MAC sublayer governs how data is placed onto the physical medium.
    - The MAC Address consists of 2 parts:

        ![MAC Address Layout](/assets/img/networking/basics/mac-address-layout.jpg)
      - `Organizationally Unique Identifier(OUI)` - Pre-defined by IEEE for each organization manufactured by an NIC manufacturing organization.
      - `Vendor Assigned` - Allocated by the vendor who manufactured the NIC.

    - Its responsibilities include:
      - `Physical Addressing`: Assigning MAC addresses to devices and using these addresses to ensure data is delivered to the correct hardware.
      - `Access Control`: Determining when a device has the right to use the physical medium, especially in environments where multiple devices share the same medium.

    - Type of MAC Addresses

        ![Types of MAC Address](/assets/img/networking/basics/types-of-mac-addresses.jpg)

### Data Link Layer Frame Structure

![Data Link Layer Frame Structure](/assets/img/networking/basics/data-link-layer-frame-structure.png)

### Functions of the Data Link Layer

1. `Framing`
    - The Data Link Layer encapsulates network layer data into frames, adding headers and trailers to define the start and end of each frame.
    - This delineation is crucial for the receiver to interpret the data correctly.

2. `Addressing`
    - It uses physical addresses (MAC addresses) to identify devices within the same network segment, ensuring that data is delivered to the correct destination.

3. `Error Detection and Correction`
    - The layer implements mechanisms like Cyclic Redundancy Check (CRC) to detect errors in transmitted frames.
    - Some protocols also provide error correction capabilities to recover corrupted data.
    - Example: Ethernet MTU

        | Component           | Size (bytes) |
        |---------------------|--------------|
        | Ethernet MTU        | 1500         |
        | IP Header           | 20           |
        | TCP Header          | 20           |
        | Application Payload | 1460         |

4. `Flow Control`
    - To prevent overwhelming the receiver, the Data Link Layer manages the rate of data transmission between sender and receiver.
    - MTU (Maximum Transmission Unit) is the largest size of a single data packet or frame—measured in bytes—that a network interface at the Data Link Layer (Layer 2) can transmit in one piece without needing to fragment it.

5. `Access Control`
    - In shared media environments, it determines which device has control over the communication channel at any given time, preventing collisions and ensuring orderly data transmission.

### Data Link Layer Protocols

Several protocols operate at the Data Link Layer, each designed to handle specific types of network communication:

1. `Synchronous Data Link Control (SDLC)`
    - Developed by IBM, SDLC is a bit-oriented protocol used for synchronous, code-transparent, serial-by-bit information transfer over a link.
    - It supports both point-to-point and multi-point configurations.

2. `High-Level Data Link Control (HDLC)`
    - An ISO standard, HDLC is a bit-oriented protocol for communication over point-to-point and multipoint links.
    - It provides both connection-oriented and connectionless service.

3. `Serial Line Internet Protocol (SLIP)`
    - An older protocol used for encapsulating IP packets over serial lines.
    - It has been largely replaced by PPP due to its lack of error detection and configuration capabilities.

4. `Point-to-Point Protocol (PPP)`
    - PPP is used to establish a direct connection between two networking nodes.
    - It can provide connection authentication, transmission encryption, and compression.

5. `Link Access Procedure (LAP)`
    - A family of protocols used in X.25 networks, including LAPB (Balanced) and LAPD (D-channel), providing reliable data transfer over point-to-point links.

6. `Link Control Protocol (LCP)`
    - A component of PPP, LCP is used to establish, configure, and test the data link connection.

7. `Network Control Protocol (NCP)`
    - Also part of PPP, NCP is used to establish and configure different network layer protocols.

### Devices Operating at the Data Link Layer

Several network devices function at the Data Link Layer, utilizing MAC addresses to forward data:

- `Network Interface Cards (NICs)`: Hardware components that connect computers to a network, providing a unique MAC address for each device.
- `Switches`: Devices that receive, process, and forward data to the destination device based on MAC addresses.
- `Bridges`: Used to divide a network into segments, reducing traffic and increasing performance by filtering data traffic at the data link layer.
- `Wireless Access Points (WAPs)`: Allow wireless devices to connect to a wired network using Wi-Fi, operating at the data link layer to manage wireless communication.

### Limitations of the Data Link Layer

While the Data Link Layer is essential for reliable data transmission, it has certain limitations:

- `Scope`: Its addressing is limited to local network segments and does not handle routing between different networks.
- `Security`: Being closer to the physical medium, it is more susceptible to security threats like MAC address spoofing and unauthorized access.
- `Error Handling`: While it can detect and sometimes correct errors, it cannot handle all types of errors, especially those that occur due to higher-layer issues.

### Applications of the Data Link Layer

The Data Link Layer is fundamental in various networking scenarios:

- `Local Area Networks (LANs)`: Ensures efficient and reliable communication within a local network.
- `Wide Area Networks (WANs)`: Protocols like HDLC and PPP are used for communication over long distances.
- `Wireless Networks`: Manages the communication between wireless devices and access points.
- `Internet Access`: Protocols like PPP are used for establishing internet connections over dial-up or broadband links.

### Transmission Types in the Data Link Layer

At the Data Link Layer (Layer 2 of the OSI model), data is transmitted between directly connected nodes using different transmission modes, which define how communication occurs between sender and receiver.

The three main transmission types are:

1. `Simplex`

    - Simplex transmission is one-way communication. Data flows only in one direction from sender to receiver.
    - Characteristics:
      - The sender can only transmit.
      - The receiver can only receive.
      - No feedback or response possible.

    - Examples:
      - Traditional broadcast TV or radio
      - Keyboard to computer

2. Half-Duplex
    - Half-duplex transmission allows two-way communication, but only one direction at a time.
    - Characteristics:
      - Both devices can send and receive, but not simultaneously.
      - Requires switching between sending and receiving modes.
    - Examples:
      - Walkie-talkies
      - CB radios
      - Some legacy network hubs

3. Full-Duplex
    - Full-duplex transmission allows simultaneous two-way communication between devices.
    - Characteristics:
      - Both devices can send and receive at the same time.
      - Requires proper channel separation or collision handling (e.g., using separate wires or switching).
    - Examples:
      - Modern Ethernet
      - Telephone conversations
      - Network switches using separate TX/RX wires

### Conclusion

Understanding the Data Link Layer is crucial for anyone involved in networking, as it ensures that data is transmitted reliably and efficiently across the physical medium. Its protocols and mechanisms form the backbone of local and wide area network communications.