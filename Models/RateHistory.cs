namespace PedersenGroupTimeClock.Models
{
    public class RateHistory
    {
        public int Id { get; set; }
        public int RateId { get; set; }
        public decimal OldRate { get; set; }
        public decimal NewRate { get; set; }
        public DateTime ChangeDate { get; set; }
        public virtual Rate Rate { get; set; }
    }
}
