import { Request, Response } from "express";
import { getAdminDb } from "../config/firebase-admin";

export const getPublicAnalytics = async (req: Request, res: Response) => {
  try {
    const adminDb = getAdminDb();
    
    // Use Promise.allSettled to be resilient to individual collection failures
    const [linksRes, usersRes, campsRes, brandsRes, influencersRes] = await Promise.allSettled([
      adminDb.collection("links").get(),
      adminDb.collection("users").get(),
      adminDb.collection("campaigns").get(),
      adminDb.collection("brands").get(),
      adminDb.collection("influencers").get()
    ]);

    if (linksRes.status === 'rejected') {
      console.error("Failed to fetch links:", linksRes.reason);
    }

    const linksSnap = linksRes.status === 'fulfilled' ? linksRes.value : { docs: [] };
    const usersSnap = usersRes.status === 'fulfilled' ? usersRes.value : { docs: [] };
    const campsSnap = campsRes.status === 'fulfilled' ? campsRes.value : { docs: [] };
    const brandsCount = brandsRes.status === 'fulfilled' ? brandsRes.value.size : 0;
    const influencersCount = influencersRes.status === 'fulfilled' ? influencersRes.value.size : 0;
    const campaignsCount = campsRes.status === 'fulfilled' ? campsRes.value.size : 0;

    let totalClicks = 0;
    let totalConversions = 0;
    const influencerStats: Record<string, { name: string, clicks: number, conversions: number }> = {};
    const campaignStats: Record<string, { title: string, clicks: number, conversions: number }> = {};

    const influencersMap: Record<string, string> = {};
    usersSnap.docs.forEach(d => influencersMap[d.id] = d.data().name);

    const campaignsMap: Record<string, string> = {};
    campsSnap.docs.forEach(d => campaignsMap[d.id] = d.data().title);

    linksSnap.docs.forEach(doc => {
      const d = doc.data();
      totalClicks += d.clickCount || 0;
      totalConversions += d.conversionCount || 0;

      if (d.influencerId) {
        if (!influencerStats[d.influencerId]) {
          influencerStats[d.influencerId] = { name: influencersMap[d.influencerId] || "Unknown Influencer", clicks: 0, conversions: 0 };
        }
        influencerStats[d.influencerId].clicks += d.clickCount || 0;
        influencerStats[d.influencerId].conversions += d.conversionCount || 0;
      }

      if (d.campaignId) {
        if (!campaignStats[d.campaignId]) {
          campaignStats[d.campaignId] = { title: campaignsMap[d.campaignId] || "Unknown Campaign", clicks: 0, conversions: 0 };
        }
        campaignStats[d.campaignId].clicks += d.clickCount || 0;
        campaignStats[d.campaignId].conversions += d.conversionCount || 0;
      }
    });

    const topInfluencers = Object.values(influencerStats)
      .sort((a, b) => b.conversions - a.conversions || b.clicks - a.clicks)
      .slice(0, 10);

    const topCampaigns = Object.values(campaignStats)
      .sort((a, b) => b.conversions - a.conversions || b.clicks - a.clicks)
      .slice(0, 10);

    res.json({
      totalClicks,
      totalConversions,
      topInfluencers,
      topCampaigns,
      platformStats: {
        brands: brandsCount,
        influencers: influencersCount,
        campaigns: campaignsCount,
      }
    });

  } catch (error) {
    console.error("Public analytics critical error:", error);
    res.status(500).json({ 
      error: "Internal server error",
      totalClicks: 0,
      totalConversions: 0,
      topInfluencers: [],
      topCampaigns: [],
      platformStats: { brands: 0, influencers: 0, campaigns: 0 }
    });
  }
};
