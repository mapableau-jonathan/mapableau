# Integration Examples

Practical code examples for using Google Maps, Twilio, and Coinbase in the MapAble application.

## Google Maps Examples

### Example 1: Basic Map with Markers

```tsx
"use client";

import { GoogleMap } from "@/components/map/GoogleMap";
import { useState } from "react";

export function BasicMapExample() {
  const [markers, setMarkers] = useState([
    {
      position: [-33.8688, 151.2093] as [number, number],
      title: "Sydney Opera House",
      description: "Famous performing arts center"
    },
    {
      position: [-37.8136, 144.9631] as [number, number],
      title: "Melbourne",
      description: "Cultural capital of Australia"
    }
  ]);

  return (
    <div className="w-full h-[600px]">
      <GoogleMap
        center={{ lat: -33.8688, lng: 151.2093 }}
        zoom={8}
        markers={markers}
        enable3DBuildings={true}
        enableStreetView={true}
        onMarkerClick={(marker) => {
          console.log("Marker clicked:", marker);
        }}
        onMapClick={(location) => {
          console.log("Map clicked at:", location);
        }}
      />
    </div>
  );
}
```

### Example 2: Interactive Location Picker

```tsx
"use client";

import { GoogleMap } from "@/components/map/GoogleMap";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function LocationPickerExample() {
  const [selectedLocation, setSelectedLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  const markers = selectedLocation
    ? [
        {
          position: [selectedLocation.lat, selectedLocation.lng] as [
            number,
            number
          ],
          title: "Selected Location",
          description: `Lat: ${selectedLocation.lat}, Lng: ${selectedLocation.lng}`
        }
      ]
    : [];

  return (
    <div className="space-y-4">
      <GoogleMap
        center={selectedLocation || { lat: -33.8688, lng: 151.2093 }}
        zoom={13}
        markers={markers}
        onMapClick={setSelectedLocation}
        height="500px"
      />
      {selectedLocation && (
        <div className="p-4 bg-gray-100 rounded">
          <p>Selected Location:</p>
          <p>Latitude: {selectedLocation.lat}</p>
          <p>Longitude: {selectedLocation.lng}</p>
          <Button
            onClick={() => {
              // Save location to backend
              console.log("Saving location:", selectedLocation);
            }}
          >
            Save Location
          </Button>
        </div>
      )}
    </div>
  );
}
```

### Example 3: Map with Custom Controls

```tsx
"use client";

import { GoogleMap } from "@/components/map/GoogleMap";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function CustomControlsMapExample() {
  const [tilt, setTilt] = useState(45);
  const [heading, setHeading] = useState(0);
  const [zoom, setZoom] = useState(13);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button onClick={() => setTilt(Math.min(tilt + 10, 45))}>
          Increase Tilt
        </Button>
        <Button onClick={() => setTilt(Math.max(tilt - 10, 0))}>
          Decrease Tilt
        </Button>
        <Button onClick={() => setHeading((heading + 45) % 360)}>
          Rotate
        </Button>
        <Button onClick={() => setZoom(zoom + 1)}>Zoom In</Button>
        <Button onClick={() => setZoom(Math.max(zoom - 1, 1))}>
          Zoom Out
        </Button>
      </div>
      <GoogleMap
        center={{ lat: -33.8688, lng: 151.2093 }}
        zoom={zoom}
        tilt={tilt}
        heading={heading}
        enable3DBuildings={true}
        onTiltChange={setTilt}
        onHeadingChange={setHeading}
        height="600px"
      />
    </div>
  );
}
```

---

## Twilio SMS Examples

### Example 1: Send Verification Code

```typescript
// app/api/auth/verify-phone/route.ts
import { NextRequest, NextResponse } from "next/server";
import { TwilioSMSService } from "@/lib/services/verification/twilio-sms";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { phoneNumber } = await request.json();

    if (!phoneNumber) {
      return NextResponse.json(
        { error: "Phone number required" },
        { status: 400 }
      );
    }

    const smsService = new TwilioSMSService();
    const result = await smsService.sendVerificationCode({
      phoneNumber,
      userId: session.user.id,
      purpose: "phone_verification"
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to send verification code" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      verificationId: result.verificationId,
      expiresAt: result.expiresAt
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
```

### Example 2: Verify Code

```typescript
// app/api/auth/verify-code/route.ts
import { NextRequest, NextResponse } from "next/server";
import { TwilioSMSService } from "@/lib/services/verification/twilio-sms";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { phoneNumber, code, verificationId } = await request.json();

    if (!phoneNumber || !code || !verificationId) {
      return NextResponse.json(
        { error: "Phone number, code, and verification ID required" },
        { status: 400 }
      );
    }

    const smsService = new TwilioSMSService();
    const result = await smsService.verifyCode({
      phoneNumber,
      code,
      verificationId
    });

    if (!result.valid) {
      return NextResponse.json(
        { error: result.error || "Invalid verification code" },
        { status: 400 }
      );
    }

    // Update user's phone number as verified
    // await prisma.user.update({
    //   where: { id: session.user.id },
    //   data: { phoneVerified: true, phoneNumber }
    // });

    return NextResponse.json({
      verified: true,
      verifiedAt: result.verifiedAt
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
```

### Example 3: Send Notification SMS

```typescript
// app/api/notifications/sms/route.ts
import { NextRequest, NextResponse } from "next/server";
import { TwilioSMSService } from "@/lib/services/verification/twilio-sms";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { phoneNumber, message } = await request.json();

    if (!phoneNumber || !message) {
      return NextResponse.json(
        { error: "Phone number and message required" },
        { status: 400 }
      );
    }

    const smsService = new TwilioSMSService();
    const result = await smsService.sendMessage(phoneNumber, message);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to send SMS" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      messageId: result.messageId
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
```

### Example 4: Frontend SMS Verification Component

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function SMSVerificationForm() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [code, setCode] = useState("");
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const sendCode = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/auth/verify-phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber })
      });

      const data = await response.json();
      if (response.ok) {
        setVerificationId(data.verificationId);
        setMessage("Verification code sent!");
      } else {
        setMessage(data.error || "Failed to send code");
      }
    } catch (error) {
      setMessage("Error sending verification code");
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    if (!verificationId) {
      setMessage("Please send a code first");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber,
          code,
          verificationId
        })
      });

      const data = await response.json();
      if (response.ok) {
        setMessage("Phone number verified successfully!");
      } else {
        setMessage(data.error || "Invalid code");
      }
    } catch (error) {
      setMessage("Error verifying code");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 p-4">
      <div>
        <label>Phone Number</label>
        <Input
          type="tel"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          placeholder="+61412345678"
        />
      </div>

      {!verificationId ? (
        <Button onClick={sendCode} disabled={loading || !phoneNumber}>
          {loading ? "Sending..." : "Send Verification Code"}
        </Button>
      ) : (
        <>
          <div>
            <label>Verification Code</label>
            <Input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="123456"
              maxLength={6}
            />
          </div>
          <Button onClick={verifyCode} disabled={loading || !code}>
            {loading ? "Verifying..." : "Verify Code"}
          </Button>
        </>
      )}

      {message && <p className="text-sm text-gray-600">{message}</p>}
    </div>
  );
}
```

---

## Coinbase Examples

### Example 1: Create Payment Charge

```typescript
// app/api/payments/create/route.ts
import { NextRequest, NextResponse } from "next/server";
import { PaymentProviderService } from "@/lib/services/abilitypay/banking";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { amount, description, metadata } = await request.json();

    // Create transaction record
    const transaction = await prisma.paymentTransaction.create({
      data: {
        userId: session.user.id,
        amount: amount.toString(),
        currency: "AUD",
        status: "PENDING",
        paymentMethod: "coinbase",
        description
      }
    });

    // Initialize payment service
    const paymentService = new PaymentProviderService({
      provider: "coinbase",
      coinbaseConfig: {
        apiKey: process.env.COINBASE_API_KEY,
        apiSecret: process.env.COINBASE_API_SECRET,
        webhookSecret: process.env.COINBASE_WEBHOOK_SECRET
      }
    });

    // Create Coinbase charge
    const payment = await paymentService.initiatePayment(
      {
        amount,
        currency: "AUD",
        description,
        reference: transaction.id,
        redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/payment/success?transactionId=${transaction.id}`,
        cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL}/payment/cancel?transactionId=${transaction.id}`,
        metadata: {
          userId: session.user.id,
          transactionId: transaction.id,
          ...metadata
        }
      },
      "coinbase"
    );

    // Update transaction with charge ID
    await prisma.paymentTransaction.update({
      where: { id: transaction.id },
      data: {
        blockchainTxHash: payment.paymentId
      }
    });

    return NextResponse.json({
      transactionId: transaction.id,
      paymentUrl: payment.hostedUrl,
      chargeId: payment.paymentId
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
```

### Example 2: Check Payment Status

```typescript
// app/api/payments/[transactionId]/status/route.ts
import { NextRequest, NextResponse } from "next/server";
import { PaymentProviderService } from "@/lib/services/abilitypay/banking";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: { transactionId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const transaction = await prisma.paymentTransaction.findUnique({
      where: { id: params.transactionId }
    });

    if (!transaction || transaction.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      );
    }

    if (!transaction.blockchainTxHash) {
      return NextResponse.json({
        status: transaction.status,
        message: "Payment not initiated"
      });
    }

    // Check status from Coinbase
    const paymentService = new PaymentProviderService({
      provider: "coinbase",
      coinbaseConfig: {
        apiKey: process.env.COINBASE_API_KEY,
        apiSecret: process.env.COINBASE_API_SECRET
      }
    });

    const paymentStatus = await paymentService.getPaymentStatus(
      transaction.blockchainTxHash,
      "coinbase"
    );

    // Update transaction if status changed
    if (paymentStatus.status !== transaction.status) {
      await prisma.paymentTransaction.update({
        where: { id: transaction.id },
        data: {
          status: paymentStatus.status as any,
          completedAt:
            paymentStatus.status === "COMPLETED" ? new Date() : undefined
        }
      });
    }

    return NextResponse.json({
      status: paymentStatus.status,
      transaction: {
        id: transaction.id,
        amount: transaction.amount,
        currency: transaction.currency,
        status: paymentStatus.status
      }
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
```

### Example 3: Frontend Payment Component

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function CoinbasePaymentForm() {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);

  const createPayment = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/payments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseFloat(amount),
          description
        })
      });

      const data = await response.json();
      if (response.ok) {
        setPaymentUrl(data.paymentUrl);
        // Redirect to payment page
        window.location.href = data.paymentUrl;
      } else {
        alert(data.error || "Failed to create payment");
      }
    } catch (error) {
      alert("Error creating payment");
    } finally {
      setLoading(false);
    }
  };

  if (paymentUrl) {
    return (
      <div className="p-4">
        <p>Redirecting to payment page...</p>
        <a href={paymentUrl} className="text-blue-500 underline">
          Click here if not redirected
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <div>
        <label>Amount (AUD)</label>
        <Input
          type="number"
          step="0.01"
          min="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="100.00"
        />
      </div>

      <div>
        <label>Description</label>
        <Input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Payment description"
        />
      </div>

      <Button
        onClick={createPayment}
        disabled={loading || !amount || !description}
      >
        {loading ? "Creating Payment..." : "Pay with Cryptocurrency"}
      </Button>
    </div>
  );
}
```

### Example 4: Combined Payment Flow with SMS Verification

```typescript
// app/api/payments/secure/route.ts
import { NextRequest, NextResponse } from "next/server";
import { PaymentProviderService } from "@/lib/services/abilitypay/banking";
import { TwilioSMSService } from "@/lib/services/verification/twilio-sms";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { amount, description, phoneNumber, verificationCode, verificationId } =
      await request.json();

    // Step 1: Verify SMS code if provided
    if (verificationCode && verificationId) {
      const smsService = new TwilioSMSService();
      const verifyResult = await smsService.verifyCode({
        phoneNumber,
        code: verificationCode,
        verificationId
      });

      if (!verifyResult.valid) {
        return NextResponse.json(
          { error: "Invalid verification code" },
          { status: 400 }
        );
      }
    } else {
      // Step 1: Send verification code
      const smsService = new TwilioSMSService();
      const smsResult = await smsService.sendVerificationCode({
        phoneNumber,
        userId: session.user.id,
        purpose: "payment"
      });

      if (!smsResult.success) {
        return NextResponse.json(
          { error: "Failed to send verification code" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        step: "verify",
        verificationId: smsResult.verificationId,
        expiresAt: smsResult.expiresAt
      });
    }

    // Step 2: Create payment after verification
    const transaction = await prisma.paymentTransaction.create({
      data: {
        userId: session.user.id,
        amount: amount.toString(),
        currency: "AUD",
        status: "PENDING",
        paymentMethod: "coinbase",
        description
      }
    });

    const paymentService = new PaymentProviderService({
      provider: "coinbase",
      coinbaseConfig: {
        apiKey: process.env.COINBASE_API_KEY,
        apiSecret: process.env.COINBASE_API_SECRET,
        webhookSecret: process.env.COINBASE_WEBHOOK_SECRET
      }
    });

    const payment = await paymentService.initiatePayment(
      {
        amount,
        currency: "AUD",
        description,
        reference: transaction.id,
        redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/payment/success?transactionId=${transaction.id}`,
        cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL}/payment/cancel?transactionId=${transaction.id}`,
        metadata: {
          userId: session.user.id,
          transactionId: transaction.id,
          phoneNumber
        }
      },
      "coinbase"
    );

    await prisma.paymentTransaction.update({
      where: { id: transaction.id },
      data: {
        blockchainTxHash: payment.paymentId
      }
    });

    return NextResponse.json({
      step: "payment",
      transactionId: transaction.id,
      paymentUrl: payment.hostedUrl,
      chargeId: payment.paymentId
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
```

---

## Complete Integration Example

### Payment Page with Map, SMS Verification, and Coinbase

```tsx
"use client";

import { GoogleMap } from "@/components/map/GoogleMap";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function CompletePaymentPage() {
  const [step, setStep] = useState<"location" | "verify" | "payment">("location");
  const [selectedLocation, setSelectedLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [amount, setAmount] = useState("100.00");
  const [loading, setLoading] = useState(false);

  const handleLocationSelect = (location: { lat: number; lng: number }) => {
    setSelectedLocation(location);
    setStep("verify");
  };

  const sendVerificationCode = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/payments/secure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseFloat(amount),
          description: `Payment for location: ${selectedLocation?.lat}, ${selectedLocation?.lng}`,
          phoneNumber
        })
      });

      const data = await response.json();
      if (response.ok && data.step === "verify") {
        setVerificationId(data.verificationId);
      }
    } catch (error) {
      alert("Error sending verification code");
    } finally {
      setLoading(false);
    }
  };

  const completePayment = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/payments/secure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseFloat(amount),
          description: `Payment for location: ${selectedLocation?.lat}, ${selectedLocation?.lng}`,
          phoneNumber,
          verificationCode,
          verificationId
        })
      });

      const data = await response.json();
      if (response.ok && data.step === "payment") {
        window.location.href = data.paymentUrl;
      } else {
        alert(data.error || "Payment failed");
      }
    } catch (error) {
      alert("Error processing payment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold">Secure Payment</h1>

      {step === "location" && (
        <div className="space-y-4">
          <p>Select a location on the map:</p>
          <GoogleMap
            center={{ lat: -33.8688, lng: 151.2093 }}
            zoom={13}
            markers={
              selectedLocation
                ? [
                    {
                      position: [
                        selectedLocation.lat,
                        selectedLocation.lng
                      ] as [number, number],
                      title: "Selected Location"
                    }
                  ]
                : []
            }
            onMapClick={handleLocationSelect}
            height="400px"
          />
          {selectedLocation && (
            <Button onClick={() => setStep("verify")}>Continue</Button>
          )}
        </div>
      )}

      {step === "verify" && (
        <div className="space-y-4">
          <div>
            <label>Phone Number</label>
            <Input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+61412345678"
            />
          </div>

          {!verificationId ? (
            <Button onClick={sendVerificationCode} disabled={loading}>
              Send Verification Code
            </Button>
          ) : (
            <>
              <div>
                <label>Verification Code</label>
                <Input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="123456"
                  maxLength={6}
                />
              </div>
              <div>
                <label>Amount (AUD)</label>
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <Button onClick={completePayment} disabled={loading}>
                Complete Payment
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
```

---

## Testing Examples

### Test Google Maps

```typescript
// Test if Google Maps is available
import { isGoogleMapsAvailable } from "@/lib/config/google-maps";

console.log("Maps available:", isGoogleMapsAvailable());
```

### Test Twilio

```typescript
// Test SMS service
import { TwilioSMSService } from "@/lib/services/verification/twilio-sms";

const smsService = new TwilioSMSService();
console.log("SMS enabled:", smsService.isServiceEnabled());
```

### Test Coinbase

```typescript
// Test Coinbase adapter
import { CoinbaseAdapter } from "@/lib/services/abilitypay/banking";

const adapter = new CoinbaseAdapter();
// Try to get a charge (will fail if not configured, but tests initialization)
```
